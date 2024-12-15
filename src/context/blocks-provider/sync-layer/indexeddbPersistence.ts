import * as Y from "yjs";
import * as idb from "lib0/indexeddb";
import * as promise from "lib0/promise";
import { Observable } from "lib0/observable";

const customStoreName = "custom";
const updatesStoreName = "updates";

export const PREFERRED_TRIM_SIZE = 500;

/**
 * @param {IndexeddbPersistence} idbPersistence
 * @param {function(IDBObjectStore):void} [beforeApplyUpdatesCallback]
 * @param {function(IDBObjectStore):void} [afterApplyUpdatesCallback]
 */
export const fetchUpdates = (
  idbPersistence: IndexeddbPersistence,
  beforeApplyUpdatesCallback: (store: IDBObjectStore) => void = () => {},
  afterApplyUpdatesCallback: (store: IDBObjectStore) => void = () => {},
) => {
  const [updatesStore] = idb.transact(/** @type {IDBDatabase} */ idbPersistence.db!, [
    updatesStoreName,
  ]); // , 'readonly')
  return idb
    .getAll(updatesStore, idb.createIDBKeyRangeLowerBound(idbPersistence._dbref, false))
    .then((updates) => {
      if (!idbPersistence._destroyed) {
        beforeApplyUpdatesCallback(updatesStore);
        Y.transact(
          idbPersistence.doc,
          () => {
            updates.forEach((val) => Y.applyUpdate(idbPersistence.doc, val));
          },
          idbPersistence,
          false,
        );
        afterApplyUpdatesCallback(updatesStore);
      }
    })
    .then(() =>
      idb.getLastKey(updatesStore).then((lastKey) => {
        idbPersistence._dbref = lastKey + 1;
      }),
    )
    .then(() =>
      idb.count(updatesStore).then((cnt) => {
        idbPersistence._dbsize = cnt;
      }),
    )
    .then(() => updatesStore);
};

/**
 * @param {IndexeddbPersistence} idbPersistence
 * @param {boolean} forceStore
 */
export const storeState = (idbPersistence: IndexeddbPersistence, forceStore: boolean = true) =>
  fetchUpdates(idbPersistence).then((updatesStore) => {
    if (forceStore || idbPersistence._dbsize >= PREFERRED_TRIM_SIZE) {
      idb
        .addAutoKey(updatesStore, Y.encodeStateAsUpdate(idbPersistence.doc))
        .then(() =>
          idb.del(updatesStore, idb.createIDBKeyRangeUpperBound(idbPersistence._dbref, true)),
        )
        .then(() =>
          idb.count(updatesStore).then((cnt) => {
            idbPersistence._dbsize = cnt;
          }),
        );
    }
  });

/**
 * @param {string} name
 */
export const clearDocument = (name: string) => idb.deleteDB(name);

/**
 * @extends Observable<string>
 */
export class IndexeddbPersistence extends Observable<string> {
  doc: Y.Doc;
  name: string;
  _dbref: number;
  _dbsize: number;
  _destroyed: boolean;
  db: IDBDatabase | null;
  synced: boolean;
  private _db: Promise<IDBDatabase>;
  whenSynced: Promise<IndexeddbPersistence>;
  private _storeTimeout: number;
  private _storeTimeoutId: NodeJS.Timeout | null;
  private _storeUpdate: (update: Uint8Array, origin: any) => void;

  /**
   * @param {string} name
   * @param {Y.Doc} doc
   */
  constructor(name: string, doc: Y.Doc) {
    super();
    this.doc = doc;
    this.name = name;
    this._dbref = 0;
    this._dbsize = 0;
    this._destroyed = false;
    /**
     * @type {IDBDatabase|null}
     */
    this.db = null;
    this.synced = false;
    this._db = idb.openDB(name, (db) =>
      idb.createStores(db, [["updates", { autoIncrement: true }], ["custom"]]),
    );
    /**
     * @type {Promise<IndexeddbPersistence>}
     */
    this.whenSynced = promise.create((resolve) => this.on("synced", () => resolve(this)));

    this._db.then((db) => {
      this.db = db;
      /**
       * @param {IDBObjectStore} updatesStore
       */
      const beforeApplyUpdatesCallback = (updatesStore: IDBObjectStore) =>
        idb.addAutoKey(updatesStore, Y.encodeStateAsUpdate(doc));
      const afterApplyUpdatesCallback = () => {
        if (this._destroyed) return this;
        this.synced = true;
        this.emit("synced", [this]);
      };
      fetchUpdates(this, beforeApplyUpdatesCallback, afterApplyUpdatesCallback);
    });
    /**
     * Timeout in ms untill data is merged and persisted in idb.
     */
    this._storeTimeout = 1000;
    /**
     * @type {any}
     */
    this._storeTimeoutId = null;
    /**
     * @param {Uint8Array} update
     * @param {any} origin
     */
    this._storeUpdate = (update, origin) => {
      if (this.db && origin !== this) {
        const [updatesStore] = idb.transact(/** @type {IDBDatabase} */ this.db, [updatesStoreName]);
        idb.addAutoKey(updatesStore, update);
        if (++this._dbsize >= PREFERRED_TRIM_SIZE) {
          // debounce store call
          if (this._storeTimeoutId !== null) {
            clearTimeout(this._storeTimeoutId);
          }
          this._storeTimeoutId = setTimeout(() => {
            storeState(this, false);
            this._storeTimeoutId = null;
          }, this._storeTimeout);
        }
      }
    };
    doc.on("update", this._storeUpdate);
    this.destroy = this.destroy.bind(this);
    doc.on("destroy", this.destroy);
  }

  destroy(): Promise<void> {
    if (this._storeTimeoutId) {
      clearTimeout(this._storeTimeoutId);
    }
    this.doc.off("update", this._storeUpdate);
    this.doc.off("destroy", this.destroy);
    this._destroyed = true;
    return this._db.then((db: IDBDatabase) => {
      db.close();
    });
  }

  /**
   * Destroys this instance and removes all data from indexeddb.
   */
  clearData(): Promise<void> {
    return this.destroy().then(() => {
      idb.deleteDB(this.name);
    });
  }

  /**
   * Retrieves a value from custom store by key
   */
  get(key: string | number | ArrayBuffer | Date): Promise<any> {
    return this._db.then((db: IDBDatabase) => {
      const [custom] = idb.transact(db, [customStoreName], "readonly");
      return idb.get(custom, key);
    });
  }

  /**
   * Stores a value in custom store
   */
  set(
    key: string | number | ArrayBuffer | Date,
    value: string | number | ArrayBuffer | Date,
  ): Promise<string | number | ArrayBuffer | Date> {
    return this._db.then((db: IDBDatabase) => {
      const [custom] = idb.transact(db, [customStoreName]);
      return idb.put(custom, value, key);
    });
  }

  /**
   * Deletes a value from custom store
   */
  del(key: string | number | ArrayBuffer | Date): Promise<void> {
    return this._db.then((db: IDBDatabase) => {
      const [custom] = idb.transact(db, [customStoreName]);
      return idb.del(custom, key);
    });
  }
}
