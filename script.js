// --- 配置区域 ---
const COMIC_ROOT = 'comics';

// --- DOM元素引用 ---
const comicListContainer = document.getElementById('comic-list');
const uploadedComicList = document.getElementById('uploaded-comic-list');
const readerContainer = document.getElementById('reader-container');
const backToListButton = document.getElementById('back-to-list');
const currentComicTitleSpan = document.getElementById('current-comic-title');
const allPagesContainer = document.getElementById('all-pages-container');

// --- 全局变量 ---
let currentComic = null;
let currentPageIndex = 0;
let allComics = []; // GitHub Pages 漫画
let uploadedComics = []; // 上传的漫画

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadComicsAutomatically();
    setupEventListeners();
    setupUploadListener();
});

/**
 * 自动扫描 GitHub Pages 漫画（完全自动化，无需手动配置）
 */
async function loadComicsAutomatically() {
    try {
        // 自动获取 comics/ 目录下的所有文件夹
        const response = await fetch(`${COMIC_ROOT}/`);
        if (!response.ok) {
            // 如果目录列表不可用，尝试逐个扫描可能的中文文件夹名
            await scanPossibleChineseFolders();
            return;
        }
        
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        // 提取所有链接（文件夹名）
        const links = Array.from(doc.querySelectorAll('a'));
        const folderNames = links
            .map(link => link.getAttribute('href'))
            .filter(href => href && href.endsWith('/')) // 只保留文件夹
            .map(folder => folder.replace('/', '')); // 移除末尾斜杠
        
        console.log('发现文件夹:', folderNames);
        
        for (const folder of folderNames) {
            const comic = await buildComicFromFolder(folder);
            if (comic && comic.pages.length > 0) {
                allComics.push(comic);
            }
        }
        
        renderComicList();
    } catch (error) {
        console.log('目录列表不可用，尝试逐个扫描可能的中文文件夹名...');
        await scanPossibleChineseFolders();
    }
}

/**
 * 扫描可能的中文文件夹名（针对 GitHub Pages 特殊情况）
 */
async function scanPossibleChineseFolders() {
    // 常见的中文漫画文件夹名（根据你的情况添加）
    const possibleNames = [
        '雾蓝色的雨后晴天',
        'life线上的我们',
        'test',
        'comics',
        // 可以在这里添加更多可能的中文名
    ];
    
    for (const folderName of possibleNames) {
        try {
            // 尝试访问该文件夹
            const testResponse = await fetch(`${COMIC_ROOT}/${folderName}/`);
            if (testResponse.ok) {
                const comic = await buildComicFromFolder(folderName);
                if (comic && comic.pages.length > 0) {
                    allComics.push(comic);
                    console.log(`找到漫画: ${folderName}`);
                }
            }
        } catch (error) {
            // 忽略错误，继续尝试下一个
        }
    }
    
    renderComicList();
}

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

        renderUploadedComics();
    });
}

/**
 * 渲染上传的漫画列表
 */
function renderUploadedComics() {
    uploadedComicList.innerHTML = '';
    
    if (uploadedComics.length === 0) {
        uploadedComicList.innerHTML = '<p>暂无上传的漫画</p>';
        return;
    }

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
        uploadedComicList.appendChild(comicItem);
    });
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

/**
 * 检查图片是否存在
 */
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        }, 3000);

        img.onload = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        };

        img.onerror = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(false);
            }
        };

        img.src = url;
    });
}

/**
 * 从文件夹构建漫画对象
 */
async function buildComicFromFolder(folderName) {
    try {
        const baseDir = `${COMIC_ROOT}/${folderName}`;
        const pages = new Set();

        // 生成可能的文件名候选
        const candidates = [];
        for (let i = 1; i <= 9999; i++) {
            const str = i.toString();
            candidates.push(
                `${str}.jpg`,
                `${str.padStart(2, '0')}.jpg`,
                `${str.padStart(3, '0')}.jpg`,
                `${str.padStart(4, '0')}.jpg`,
                `${str}.jpeg`,
                `${str.padStart(2, '0')}.jpeg`,
                `${str.padStart(3, '0')}.jpeg`,
                `${str.padStart(4, '0')}.jpeg`
            );
        }

        const uniqueCandidates = [...new Set(candidates)];
        const BATCH_SIZE = 20;

        for (let i = 0; i < uniqueCandidates.length; i += BATCH_SIZE) {
            const batch = uniqueCandidates.slice(i, i + BATCH_SIZE);
            const promises = batch.map(async (filename) => {
                const url = `${baseDir}/${filename}`;
                if (await imageExists(url)) {
                    pages.add(url);
                }
            });
            await Promise.all(promises);
        }

        if (pages.size === 0) {
            console.warn(`未在 ${folderName} 中找到任何图片`);
            return null;
        }

        const sortedPages = Array.from(pages).sort((a, b) => {
            const numA = parseInt(a.match(/\/(\d+)\./)?.[1]) || 0;
            const numB = parseInt(b.match(/\/(\d+)\./)?.[1]) || 0;
            return numA - numB;
        });

        return {
            id: folderName,
            title: folderName,
            cover: sortedPages[0],
            pages: sortedPages,
            isUploaded: false
        };
    } catch (error) {
        console.error(`构建漫画 ${folderName} 失败:`, error);
        return null;
    }
}

/**
 * 渲染漫画列表
 */
function renderComicList() {
    const githubComicsContainer = document.getElementById('github-comics');
    if (!githubComicsContainer) {
        // 如果还没有创建 GitHub 漫画容器，创建它
        comicListContainer.innerHTML = '<h2>📚 GitHub 漫画</h2><div id="github-comics"></div>';
    }

    const githubComicsContainerFinal = document.getElementById('github-comics');
    
    if (allComics.length === 0) {
        githubComicsContainerFinal.innerHTML = `
            <p>🔍 正在扫描 GitHub 漫画...</p>
            <p>如果长时间未显示，请确认：</p>
            <ul>
                <li>漫画图片放在 <code>comics/文件夹名/</code> 下</li>
                <li>图片格式为 <code>.jpg</code> 或 <code>.jpeg</code></li>
                <li>文件夹名包含中文时已正确编码</li>
            </ul>
        `;
    } else {
        githubComicsContainerFinal.innerHTML = '';
        allComics.forEach(comic => {
            const comicItem = document.createElement('div');
            comicItem.className = 'comic-item';
            comicItem.dataset.id = comic.id;

            comicItem.innerHTML = `
                <img src="${comic.cover}" alt="${comic.title} 封面" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22250%22 viewBox=%220 0 180 250%22%3E%3Crect width=%22180%22 height=%22250%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2250%22 y=%22130%22 font-size=%2214%22 fill=%22%23999%22%3E无封面%3C/text%3E%3C/svg%3E'">
                <h3>${comic.title}</h3>
            `;

            comicItem.addEventListener('click', () => openComicReader(comic));
            githubComicsContainerFinal.appendChild(comicItem);
        });
    }

    // 渲染上传的漫画
    renderUploadedComics();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    backToListButton.addEventListener('click', showComicList);
}

/**
 * 打开阅读器
 */
function openComicReader(comic) {
    currentComic = comic;
    currentPageIndex = 0;
    currentComicTitleSpan.textContent = comic.title;

    allPagesContainer.innerHTML = '';

    comic.pages.forEach((pageUrl) => {
        const imgElement = document.createElement('img');
        if (comic.isUploaded) {
            imgElement.src = URL.createObjectURL(pageUrl);
        } else {
            imgElement.src = pageUrl;
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
