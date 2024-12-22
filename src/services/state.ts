let connection = indexedDB.open('githelm', 1);


connection.onsuccess = function (event) {
  let db = event.target.result;
  let tx = db.transaction('githelm', 'readwrite');
  let store = tx.objectStore('githelm');
  let index = store.index('org-repo');
  let request = index.getAll('githelm/githelm');
  request.onsuccess = function (event) {
    let data = event.target.result;
    console.log(data);
  };
}
