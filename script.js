const storagePrefix = "file-storage_"
const breadcrumbsEl = document.querySelector(".breadcrumbs")
const directoryEl = document.querySelector(".directory")
// const createFolderForm = document.querySelector(".create-folder")
const fileUploadInput = document.querySelector(".file-upload input")
const progressModal = document.querySelector(".progress-modal")
const createFolderModal = document.querySelector(".create-folder-modal")
const createFolderForm = document.querySelector(".create-folder-modal form")
const createTxtModal = document.querySelector(".create-txt-modal")
const createTxtForm = document.querySelector(".create-txt-modal form")


let currentFolder = { id: null, name: "My Drive", path: null, type: "root" }

let items = []

let selectedItem = null

const socket = io('http://127.0.0.1:3000');  // Connect to the WebSocket server

function stopPropagation(event) {
  event.stopPropagation()
}

function displayFile(file) {
  let icon = (isImage(file.name) && file.url) ? file.url : "images/file.png"
  
  return `
    <div class="item file" onclick="selectItem('${file.id}')" data-id="${file.id}">
      <img src="${icon}" class="icon">
      <p class="title">${file.name}</p>
    </div>
  `
}

function displayFolder(folder) {
  let icon = "images/folder.png"
  
  return `
    <div class="item folder" onclick="selectItem('${folder.id}')" data-id="${folder.id}">
      <img src="${icon}" class="icon">
      <p class="title">${folder.name}</p>
    </div>
  `
}

async function refreshFiles(files) {
  items = files.folders.concat(files.files)

  if (items.length > 0) {
    directoryEl.innerHTML = items.map(item => (
      item.type === "folder" ? displayFolder(item) : displayFile(item)
    )).join(" ")
  } else {
    directoryEl.innerHTML = `Folder is empty`
  }
}

function isImage(filename) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tiff'];

  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

async function openFolder(folderId) {
  loading(0)
  currentFolder = await getFolder(folderId)
  loading(50)
  listFiles(folderId, refreshFiles)

  // console.log(currentFolder.path)
  displayBreadcrumbs()

  loading(100)
  setTimeout(()=>loading(null), 500);
}


async function displayBreadcrumbs() {

  breadcrumbsEl.innerHTML = `<span onclick="openFolder(null)">My Drive</span>`

  if (currentFolder.type === "root") return

  for (const folderId of currentFolder.path) {
    const folder = await getFolder(folderId)
    
    breadcrumbsEl.innerHTML += ` / <span onclick="openFolder('${folderId}')">${folder.name}<span>`
  }

  breadcrumbsEl.innerHTML += `  / <span>${currentFolder.name}</span>`
}


fileUploadInput.addEventListener("input", function() {
  const file = fileUploadInput.files[0]
  if (!file) return

  const formData = new FormData();
  formData.append('file', file);
  if (currentFolder.id) formData.append('folderId', currentFolder.id);

  fetch('http://127.0.0.1:3000/files', {
    method: 'POST',
    body: formData
  })
})

async function selectItem(itemId) {

  // double click on item
  if (selectedItem && selectedItem.id === itemId) {

    selectedItem.type === "file" ? downloadItem() : openFolder(itemId)

    return
  }

  if (selectedItem) {
    const element = document.querySelector(`[data-id="${selectedItem.id}"]`);
    if (element) element.classList.remove("selected")
  }

  const item = items.find(item => item.id === itemId)
  selectedItem = item

  const element = document.querySelector(`[data-id="${selectedItem.id}"]`);
  element.classList.add("selected")
}

function downloadItem() {
  if (!selectedItem) return
  if (selectedItem.type !== "file") return

  window.open(selectedItem.url, '_blank')
}

function deleteItem() {
  if (!selectedItem) return

  if (selectedItem.type === "file") {
    fetch(`http://127.0.0.1:3000/files/${selectedItem.id}`, { method: 'DELETE' })
  } else {
    fetch(`http://127.0.0.1:3000/folders/${selectedItem.id}`, { method: 'DELETE' })
  }

  selectedItem = null
}


openFolder(null)


// Listen for progress updates from the server
socket.on('progress', (progress) => {
  loading(progress)
});

function loading(progress) {

  const progressEl = document.querySelector(".progress-modal progress")
  const statusEl = document.querySelector(".progress-modal .status")

  if (typeof progress === 'number') {
    progressModal.classList.remove("hidden")
    progressEl.value = progress
    statusEl.innerText = `${Math.round(progress)}%`;
  } 
  
  if ((typeof progress === 'number' && progress >= 100) || typeof progress !== 'number') {
    setTimeout(() => {
      progressModal.classList.add("hidden")
      progressEl.value = 0
      statusEl.innerText = ""
    }, 500)
  }
}

function createFolder() {

  const data = {
    folderName: createFolderForm.elements['folderName'].value,
    parentFolderId: currentFolder.id
  }

  fetch("http://127.0.0.1:3000/folders", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
}

function openCreateFolderModal() {
  createFolderModal.classList.toggle("hidden")
}

createFolderForm.addEventListener("submit", function(e) {
  e.preventDefault()

  createFolder()

  createFolderForm.reset()

  openCreateFolderModal()
})

function createTxt() {
  
  const data = {
    name: createTxtForm.elements['name'].value,
    content: createTxtForm.elements['content'].value,
    folderId: currentFolder.id
  }

  fetch("http://127.0.0.1:3000/files/txt", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
}

function openCreateTxtModal() {
  createTxtModal.classList.toggle("hidden")
}

createTxtForm.addEventListener("submit", function(e) {
  e.preventDefault()

  createTxt()

  createTxtForm.reset()

  openCreateTxtModal()
})




function listFiles(folderId) {
  socket.emit('listFiles', folderId);
}

// Listen for updates from the server
socket.on('updateFiles', (result) => {
  refreshFiles(result);
});





// document.addEventListener("keydown", function(event) {
//   if (event.key === " ") getFile("w7BTG0G5WiCH2v5PpsBI")
// })


window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`
  console.error(error)
  alert(error)
});
