<script lang="ts">
</script>

<form id="repo-form" class="p-4 bg-gray-700 rounded-md space-y-4">
  <div>
    <label for="org-input" class="block text-sm font-medium text-white">Organization</label>
    <input id="org-input" type="text" class="mt-1 block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white" required />
  </div>
  <div>
    <label for="repo-input" class="block text-sm font-medium text-white">Repository</label>
    <input id="repo-input" type="text" class="mt-1 block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white" required />
  </div>
  <div>
    <label for="repo-labels-input" class="block text-sm font-medium text-white">Labels</label>
    <input id="repo-labels-input" type="text" class="mt-1 block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white" required />
  </div>
  <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Add</button>
</form>
