// --- 配置区域 ---
// 只需确保你的漫画放在 comics/ 子文件夹中，如: comics/wulanse/
const COMIC_ROOT = 'comics';

// --- DOM元素引用 ---
const comicListContainer = document.getElementById('comic-list');
const readerContainer = document.getElementById('reader-container');
const backToListButton = document.getElementById('back-to-list');
const currentComicTitleSpan = document.getElementById('current-comic-title');

// 新增：用于存放所有图片的容器
const allPagesContainer = document.getElementById('all-pages-container');

// --- 全局变量 ---
let currentComic = null;
let currentPageIndex = 0; // 保留这个变量，可能后续有用
let allComics = [];

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadComicsAutomatically();
    setupEventListeners();
});

/**
 * 自动加载所有漫画：扫描 comics/ 下的每个子文件夹，收集 .jpg 文件
 */
async function loadComicsAutomatically() {
    if (!comicListContainer) return;

    comicListContainer.innerHTML = '<p>正在扫描漫画...</p>';

    try {
        const comicFolders = await getComicFolderNames();
        if (comicFolders.length === 0) {
            comicListContainer.innerHTML = `
                <p>⚠️ 未检测到漫画文件夹。</p>
                <p>请确保：</p>
                <ul>
                    <li>你的漫画图片放在 <code>comics/你的文件夹名/</code> 下（如 <code>comics/wulanse/</code>）</li>
                    <li>图片格式为 .jpg 或 .jpeg（大小写不敏感）</li>
                    <li>在下方代码中将 <code>COMIC_FOLDERS</code> 改为你的文件夹名，例如：<br>
                        <code>const COMIC_FOLDERS = ['wulanse'];</code>
                    </li>
                </ul>
            `;
            return;
        }

        for (const folder of comicFolders) {
            const comic = await buildComicFromFolder(folder);
            if (comic && comic.pages.length > 0) {
                allComics.push(comic);
            }
        }

        if (allComics.length === 0) {
            comicListContainer.innerHTML = `
                <p>🔍 扫描完成，但未找到任何 JPG 图片。</p>
                <p>请检查：</p>
                <ul>
                    <li>文件夹名是否正确？当前检测：<code>${comicFolders.join(', ')}</code></li>
                    <li>图片是否为 .jpg 或 .jpeg？GitHub Pages 不支持 .JPG 大写（建议统一小写）</li>
                    <li>图片是否在 <code>comics/文件夹名/</code> 下？</li>
                </ul>
            `;
            return;
        }

        renderComicList();
    } catch (error) {
        console.error('加载漫画失败:', error);
        comicListContainer.innerHTML = `<p>❌ 加载失败：${error.message}</p>`;
    }
}

// ✅ 关键：在这里填写你的漫画文件夹名！
const COMIC_FOLDERS = ['wulanse']; // ← 修改这里！

/**
 * 获取用户配置的漫画文件夹名列表
 */
async function getComicFolderNames() {
    return COMIC_FOLDERS;
}

/**
 * 从单个文件夹构建漫画对象（动态扫描所有 .jpg/.jpeg 文件）
 * @param {string} folderName - 文件夹名，如 'wulanse'
 * @returns {Object|null}
 */
async function buildComicFromFolder(folderName) {
    try {
        const pages = [];

        // ✅ 动态扫描：从 1 开始，直到连续找不到很多张为止
        let i = 1;
        let consecutiveNotFound = 0;
        const maxConsecutiveNotFound = 10; // 连续 10 张找不到就停止

        while (consecutiveNotFound < maxConsecutiveNotFound) {
            const jpgUrl = `${COMIC_ROOT}/${folderName}/${i}.jpg`;
            const jpegUrl = `${COMIC_ROOT}/${folderName}/${i}.jpeg`;

            let found = false;

            if (await imageExists(jpgUrl)) {
                pages.push(jpgUrl);
                found = true;
            } else if (await imageExists(jpegUrl)) {
                pages.push(jpegUrl);
                found = true;
            }

            if (found) {
                consecutiveNotFound = 0; // 重置计数器
            } else {
                consecutiveNotFound++; // 未找到，计数器+1
            }

            i++;
            
            // 安全上限，防止死循环
            if (i > 1000) {
                console.warn(`扫描超过 1000 张，停止扫描 ${folderName}`);
                break;
            }
        }

        if (pages.length === 0) {
            console.warn(`未在 ${folderName} 中找到图片`);
            return null;
        }

        // 排序确保顺序正确
        pages.sort((a, b) => {
            const numA = parseInt(a.match(/(\d+)\./)[1]) || 0;
            const numB = parseInt(b.match(/(\d+)\./)[1]) || 0;
            return numA - numB;
        });

        return {
            id: folderName,
            title: folderName.charAt(0).toUpperCase() + folderName.slice(1),
            cover: pages[0],
            pages: pages
        };
    } catch (error) {
        console.error(`构建漫画 ${folderName} 失败:`, error);
        return null;
    }
}

/**
 * 检查图片是否存在（通过创建 Image 对象）
 * 使用旧版中能工作的逻辑
 */
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

/**
 * 渲染漫画列表
 */
function renderComicList() {
    comicListContainer.innerHTML = '';

    if (allComics.length === 0) {
        comicListContainer.innerHTML = `
            <p>❌ 未找到任何漫画。</p>
            <p><strong>请立即检查：</strong></p>
            <ol>
                <li>在 <code>script.js</code> 第 76 行，将 <code>const COMIC_FOLDERS = ['wulanse'];</code> 中的 <code>wulanse</code> 改为你实际的文件夹名（你截图中确实是 <code>wulanse</code>，所以这步应该已完成）</li>
                <li>确认图片文件名是小写 <code>.jpg</code>（不是 .JPG）</li>
                <li>图片必须在 <code>comics/wulanse/132.jpg</code> 这样的路径下</li>
            </ol>
        `;
        return;
    }

    allComics.forEach(comic => {
        const comicItem = document.createElement('div');
        comicItem.className = 'comic-item';
        comicItem.dataset.id = comic.id;

        comicItem.innerHTML = `
            <img src="${comic.cover}" alt="${comic.title} 封面" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22250%22 viewBox=%220 0 180 250%22%3E%3Crect width=%22180%22 height=%22250%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2250%22 y=%22130%22 font-size=%2214%22 fill=%22%23999%22%3E无封面%3C/text%3E%3C/svg%3E'">
            <h3>${comic.title}</h3>
        `;

        comicItem.addEventListener('click', () => openComicReader(comic));
        comicListContainer.appendChild(comicItem);
    });
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    backToListButton.addEventListener('click', showComicList);
}

/**
 * 打开阅读器（显示所有页面，使用原始编号）
 */
function openComicReader(comic) {
    currentComic = comic;
    currentPageIndex = 0; // 可以保留，但不使用
    currentComicTitleSpan.textContent = comic.title;

    // 清空旧内容
    allPagesContainer.innerHTML = '';

    // 遍历所有页面，创建图片元素并添加到容器
    comic.pages.forEach((pageUrl) => {
        const imgElement = document.createElement('img');
        imgElement.src = pageUrl;
        // 从 URL 中提取原始编号作为 alt 和页码标签
        const filenameMatch = pageUrl.match(/\/(\d+)\.\w+$/); // 匹配 /132.jpg 中的 132
        const pageNumber = filenameMatch ? filenameMatch[1] : 'Unknown'; 
        imgElement.alt = `${comic.title} 第 ${pageNumber} 页`;
        imgElement.className = 'all-pages-image'; // 添加CSS类方便控制样式
        imgElement.loading = 'lazy'; // 可选：启用懒加载，提升性能

        // 创建页码标签，使用原始编号
        const labelElement = document.createElement('div');
        labelElement.className = 'page-number-label';
        labelElement.textContent = `第 ${pageNumber} 页`;

        allPagesContainer.appendChild(labelElement);
        allPagesContainer.appendChild(imgElement);
    });

    // 隐藏漫画列表，显示阅读器
    document.getElementById('comic-list-container').style.display = 'none';
    readerContainer.style.display = 'block';

    // 关键：隐藏翻页控件
    const controls = document.getElementById('reader-controls');
    if (controls) {
        controls.style.display = 'none';
    }
    // 同样隐藏原有的单页图片显示区域
    const singlePageDisplay = document.getElementById('comic-display-area');
    if (singlePageDisplay) {
        singlePageDisplay.style.display = 'none';
    }
    // 显示存放所有图片的容器
    allPagesContainer.style.display = 'block';
}

function showComicList() {
    document.getElementById('comic-list-container').style.display = 'block';
    readerContainer.style.display = 'none';
    currentComic = null;
    currentPageIndex = 0;
}

// 🎯 重点：请务必修改这一行！
// 在你的 script.js 中找到：
// const COMIC_FOLDERS = ['wulanse'];
// 确保它和你仓库里的文件夹名完全一致（大小写也要一致！）
