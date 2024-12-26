<script lang="ts">
</script>

<form id="pr-add-repo-form" class="p-4 bg-gray-700 rounded-md space-y-4">
  <div>
    <label for="pr-org-input" class="block text-sm font-medium text-white">Organization</label>
    <input
      id="pr-org-input"
      type="text"
      class="mt-1 block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white"
      placeholder="Organization"
      required
    />
  </div>
  <div>
    <label for="pr-repo-input" class="block text-sm font-medium text-white">Repository</label>
    <input
      id="pr-repo-input"
      type="text"
      class="mt-1 block w-full p-2 rounded-md bg-gray-600 text-white border-gray-600 focus:border-white focus:ring-white"
      placeholder="Repository"
      required
    />
  </div>
  <div class="w-full p-2 rounded-md bg-gray-600 text-white flex flex-wrap items-center border border-gray-600 focus-within:border-white">
    <div id="pr-repo-labels-chips" class="flex flex-wrap"></div>
    <input id="pr-repo-labels-input" type="text" class="flex-grow rounded-md bg-gray-600 text-white border-none focus:outline-none" placeholder="Label" />
  </div>
  <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Add</button>
</form>
