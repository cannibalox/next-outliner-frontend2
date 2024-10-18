import * as Y from 'yjs';
import { describe, it, expect, vi } from 'vitest';
// @ts-ignore
import { WebsocketProvider } from "@/common/yjs/y-websocket";

describe('yjs', async () => {
  it('test connection', async () => {
    const baseDoc = new Y.Doc({ guid: 'C:\\Users\\xiang\\Desktop\\test-dbbase' });
    const doc1 = new Y.Doc({ guid: 'C:\\Users\\xiang\\Desktop\\test-db1' });
    const doc2 = new Y.Doc({ guid: 'C:\\Users\\xiang\\Desktop\\test-db2' });
    
    const wsProvider = new WebsocketProvider(
      'ws://localhost:8081',
      'C:\\Users\\xiang\\Desktop\\test-db',
      {
        params: {
          docname: 'base',
          location: 'C:\\Users\\xiang\\Desktop\\test-db',
          authorization: 'Stardust\'s Next Outliner 2017949',
        },
      }
    );
    
    wsProvider.addDoc(baseDoc);
    wsProvider.addDoc(doc1);
    wsProvider.addDoc(doc2);
    wsProvider.connect();

    await new Promise(resolve => {
      const handler = setInterval(() => {
        if (wsProvider.synced) {
          clearInterval(handler);
          resolve(true);
        }
      }, 100);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("synced");
    console.log(baseDoc.getArray("test").toArray());
    console.log(doc1.getArray("test").toArray());
    console.log(doc2.getArray("test").toArray());

    baseDoc.getArray("test").push([1,2,3,4,5]);
    doc1.getArray("test").push([6,7,8,9,10]);
    doc2.getArray("test").push([11,12,13,14,15]);

    await new Promise(resolve => setTimeout(resolve, 10000));
    wsProvider.disconnect();
    wsProvider.destroy();
  });
}, { timeout: 10000000 });