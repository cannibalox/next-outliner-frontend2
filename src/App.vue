<template>
  <div v-if="rootBlockRef">
    <BlockTree
      id="main"
      :virtual="true"
      :root-block-ids="[rootBlockRef.id]"
      :root-block-level="0"
    ></BlockTree>
  </div>
</template>

<script setup lang="ts">
import { globalEnv } from './main';
import BlockTree from './components/BlockTree.vue';

const {blocksManager} = globalEnv;
const rootBlockRef = blocksManager.getRootBlockRef();
</script>

<style scoped>
</style>
