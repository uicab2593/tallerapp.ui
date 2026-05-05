import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api/axios'

export const useBranchStore = defineStore('branch', () => {
  const branches = ref([])
  const activeBranch = ref(null)

  function setBranches(list) {
    branches.value = list ?? []
  }

  function setActiveBranch(branch) {
    activeBranch.value = branch ?? null
  }

  async function switchBranch(branchId) {
    const { data } = await api.put('/auth/active-branch', { branch_id: branchId })
    setActiveBranch(data.active_branch)
    return data
  }

  function clear() {
    branches.value = []
    activeBranch.value = null
  }

  return { branches, activeBranch, setBranches, setActiveBranch, switchBranch, clear }
})
