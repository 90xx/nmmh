// --- DOM元素引用 ---
const comicListContainer = document.getElementById('comic-list'); // 保持ID不变，但内容只显示上传列表
const uploadedComicList = document.getElementById('uploaded-comic-list');
const readerContainer = document.getElementById('reader-container');
const backToListButton = document.getElementById('back-to-list');
const currentComicTitleSpan = document.getElementById('current-comic-title');
const allPagesContainer = document.getElementById('all-pages-container');

// --- 全局变量 ---
let currentComic = null;
let currentPageIndex = 0;
// let allComics = []; // GitHub Pages 漫画 - 移除
let uploadedComics = []; // 上传的漫画

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    // loadComicsAutomatically(); // 移除自动加载GitHub漫画
    setupEventListeners();
    setupUploadListener();
});

// --- 移除 GitHub 相关函数 ---
// async function loadComicsAutomatically() { ... }
// async function scanPossibleChineseFolders() { ... }
// async function buildComicFromFolder(folderName) { ... }
// function imageExists(url) { ... }

/**
 * 设置上传功能监听器
 */
function setupUploadListener() {
    document.getElementById('uploadFolder').addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        
        // 按文件夹分组
        const folders = {};
        files.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/');
            const folderName = pathParts[0];
            
            if (!folders[folderName]) {
                folders[folderName] = [];
            }
            folders[folderName].push(file);
        });

        // 处理每个上传的漫画文件夹
        for (const [folderName, folderFiles] of Object.entries(folders)) {
            const images = folderFiles.filter(file => 
                file.type.startsWith('image/') && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
            ).sort((a, b) => {
                const numA = parseInt(a.name.match(/\d+/)?.[0]) || 0;
                const numB = parseInt(b.name.match(/\d+/)?.[0]) || 0;
                return numA - numB;
            });

            if (images.length > 0) {
                const uploadedComic = {
                    id: `uploaded_${Date.now()}_${folderName}`,
                    title: folderName,
                    cover: images[0],
                    pages: images,
                    isUploaded: true
                };
                
                uploadedComics.push(uploadedComic);
            }
        }

        renderUploadedComics(); // 只渲染上传的漫画
    });
}

/**
 * 渲染上传的漫画列表
 */
function renderUploadedComics() {
    comicListContainer.innerHTML = ''; // 清空原本的GitHub列表区域
    uploadedComicList.innerHTML = '';
    
    if (uploadedComics.length === 0) {
        comicListContainer.innerHTML = '<p>请先上传漫画文件夹。</p>'; // 修改提示文字
        return;
    }

    // 直接在 comic-list-container 渲染上传的漫画，保持原有结构
    uploadedComics.forEach((comic, index) => {
        const comicItem = document.createElement('div');
        comicItem.className = 'comic-item';
        comicItem.dataset.id = comic.id;

        const img = document.createElement('img');
        img.src = URL.createObjectURL(comic.cover);
        img.alt = comic.title;
        img.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22250%22 viewBox=%220 0 180 250%22%3E%3Crect width=%22180%22 height=%22250%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2250%22 y=%22130%22 font-size=%2214%22 fill=%22%23999%22%3E无封面%3C/text%3E%3C/svg%3E';
        };

        comicItem.appendChild(img);
        comicItem.appendChild(document.createElement('h3')).textContent = comic.title;

        comicItem.addEventListener('click', () => openUploadedComicReader(comic));
        comicListContainer.appendChild(comicItem); // 添加到主列表容器
    });

    // uploadedComicList.innerHTML = '<p>上传漫画已显示在上方列表。</p>'; // 可选：提示已移动
}

/**
 * 打开上传漫画的阅读器
 */
function openUploadedComicReader(comic) {
    currentComic = comic;
    currentPageIndex = 0;
    currentComicTitleSpan.textContent = comic.title;

    allPagesContainer.innerHTML = '';

    comic.pages.forEach((file, pageIndex) => {
        const imgElement = document.createElement('img');
        imgElement.src = URL.createObjectURL(file);
        imgElement.alt = `${comic.title} 第 ${pageIndex + 1} 页`;
        imgElement.className = 'all-pages-image';
        imgElement.loading = 'lazy';

        const labelElement = document.createElement('div');
        labelElement.className = 'page-number-label';
        labelElement.textContent = `第 ${pageIndex + 1} 页`;

        allPagesContainer.appendChild(labelElement);
        allPagesContainer.appendChild(imgElement);
    });

    document.getElementById('comic-list-container').style.display = 'block';
    readerContainer.style.display = 'block';
    document.getElementById('reader-controls').style.display = 'none';
    document.getElementById('comic-display-area').style.display = 'none';
    allPagesContainer.style.display = 'block';
}

// --- 保留其他功能不变 ---
/**
 * 设置事件监听器
 */
function setupEventListeners() {
    backToListButton.addEventListener('click', showComicList);
}

/**
 * 打开阅读器 (兼容可能的旧调用，虽然现在只用openUploadedComicReader)
 */
function openComicReader(comic) {
    currentComic = comic;
    currentPageIndex = 0;
    currentComicTitleSpan.textContent = comic.title;

    allPagesContainer.innerHTML = '';

    comic.pages.forEach((pageUrl) => {
        const imgElement = document.createElement('img');
        if (comic.isUploaded) {
            imgElement.src = URL.createObjectURL(pageUrl); // 使用 Blob URL
        } else {
            imgElement.src = pageUrl; // 这一行理论上不会再执行
        }
        
        let pageNumber = 'Unknown';
        if (comic.isUploaded) {
            const pageIndex = comic.pages.indexOf(pageUrl);
            pageNumber = (pageIndex + 1).toString();
        } else {
            const filenameMatch = pageUrl.match(/\/(\d+)\.\w+$/);
            pageNumber = filenameMatch ? filenameMatch[1] : 'Unknown';
        }
        
        imgElement.alt = `${comic.title} 第 ${pageNumber} 页`;
        imgElement.className = 'all-pages-image';
        imgElement.loading = 'lazy';

        const labelElement = document.createElement('div');
        labelElement.className = 'page-number-label';
        labelElement.textContent = `第 ${pageNumber} 页`;

        allPagesContainer.appendChild(labelElement);
        allPagesContainer.appendChild(imgElement);
    });

    document.getElementById('comic-list-container').style.display = 'block';
    readerContainer.style.display = 'block';
    document.getElementById('reader-controls').style.display = 'none';
    document.getElementById('comic-display-area').style.display = 'none';
    allPagesContainer.style.display = 'block';
}

function showComicList() {
    document.getElementById('comic-list-container').style.display = 'block';
    readerContainer.style.display = 'none';
    currentComic = null;
    currentPageIndex = 0;
}
