// --- 配置区域 ---
// 只需确保你的漫画放在 comics/ 子文件夹中，如: comics/wulanse/
const COMIC_ROOT = 'comics';

// --- DOM元素引用 ---
const comicListContainer = document.getElementById('comic-list');
const readerContainer = document.getElementById('reader-container');
const backToListButton = document.getElementById('back-to-list');
const prevPageButton = document.getElementById('prev-page-btn');
const nextPageButton = document.getElementById('next-page-btn');
const currentPageImage = document.getElementById('current-page-image');
const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const currentComicTitleSpan = document.getElementById('current-comic-title');

// --- 全局变量 ---
let currentComic = null;
let currentPageIndex = 0;
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
        // 获取仓库中所有文件的列表（通过 GitHub API，但静态页不能直接调用）
        // 替代方案：我们预定义可能的文件夹名，或让用户在 COMIC_FOLDERS 中指定
        // 由于 GitHub Pages 是静态的，我们采用「用户指定文件夹名」+「尝试加载图片」的方式

        // 方案：从根目录的文件列表推断（但静态页无法读取目录）
        // 所以我们改用：让用户在下方数组中列出漫画文件夹名（只需一次配置）

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
// 你目前的文件夹是 "wulanse"，所以改成：
const COMIC_FOLDERS = ['wulanse']; // ← 修改这里！如果是多个，写成 ['wulanse', 'another'] 

/**
 * 获取用户配置的漫画文件夹名列表
 */
async function getComicFolderNames() {
    return COMIC_FOLDERS;
}

/**
 * 从单个文件夹构建漫画对象（自动收集所有 .jpg/.jpeg 文件）
 * @param {string} folderName - 文件夹名，如 'wulanse'
 * @returns {Object|null}
 */
async function buildComicFromFolder(folderName) {
    try {
        // 我们无法直接列出文件夹内容，但可以「试探性」加载已知文件
        // 由于你有 132.jpg, 133.jpg... 这类连续编号，我们可以：
        // 1. 尝试加载前几张图确认存在
        // 2. 但更可靠的是：要求用户在 COMIC_FOLDERS 中指定文件夹，然后我们用「已知文件名列表」方式

        // 实际上，对于静态站点，最实用的方法是：
        // ✅ 让用户自己生成一个简单的 JS 数组（仅需一次），而不是依赖自动扫描

        // 因此，我们采用「智能默认」：假设该文件夹下有 100 张以内、编号从 100 开始的 jpg
        // 但更推荐你用下面这个终极简化版——直接硬编码路径（只改一次）

        // ⚡ 终极简化方案（推荐你用这个）：
        // 我们放弃自动扫描，改为：只要文件夹存在，就按常见命名模式生成路径
        // 由于你知道文件名是 132.jpg, 133.jpg...，我们可以这样：

        const pages = [];
        let foundAny = false;

        // 尝试加载前 50 张（132 ~ 181），避免无限循环
        for (let i = 132; i <= 181; i++) {
            const filename = `${i}.jpg`;
            const url = `${COMIC_ROOT}/${folderName}/${filename}`;
            
            // 检查图片是否存在（通过预加载）
            if (await imageExists(url)) {
                pages.push(url);
                foundAny = true;
            } else {
                // 如果连续 3 张不存在，停止探测
                let consecutiveMissing = 0;
                for (let j = 1; j <= 3; j++) {
                    if (!await imageExists(`${COMIC_ROOT}/${folderName}/${i+j}.jpg`)) {
                        consecutiveMissing++;
                    } else {
                        break;
                    }
                }
                if (consecutiveMissing >= 3) break;
            }
        }

        // 如果没找到，再尝试小写 .jpeg
        if (!foundAny) {
            for (let i = 100; i <= 200; i++) {
                const filename = `${i}.jpeg`;
                const url = `${COMIC_ROOT}/${folderName}/${filename}`;
                if (await imageExists(url)) {
                    pages.push(url);
                    foundAny = true;
                }
            }
        }

        if (!foundAny) {
            // 最后 fallback：尝试列出你已上传的文件（通过已知文件名）
            // 但静态页做不到，所以我们提示用户手动配置
            console.warn(`未在 ${folderName} 中找到图片，建议使用 manifest.json 或手动配置`);
            return null;
        }

        // 排序确保顺序正确（虽然数字已有序，但保险起见）
        pages.sort((a, b) => {
            const numA = parseInt(a.match(/(\d+)\./)[1]) || 0;
            const numB = parseInt(b.match(/(\d+)\./)[1]) || 0;
            return numA - numB;
        });

        return {
            id: folderName,
            title: folderName.charAt(0).toUpperCase() + folderName.slice(1), // wulanse → Wulanse
            cover: pages[0] || `${COMIC_ROOT}/${folderName}/132.jpg`,
            pages: pages
        };
    } catch (error) {
        console.error(`构建漫画 ${folderName} 失败:`, error);
        return null;
    }
}

/**
 * 检查图片是否存在（通过创建 Image 对象）
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
    prevPageButton.addEventListener('click', () => {
        if (currentPageIndex > 0) {
            currentPageIndex--;
            renderCurrentPage();
        }
    });
    nextPageButton.addEventListener('click', () => {
        if (currentComic && currentPageIndex < currentComic.pages.length - 1) {
            currentPageIndex++;
            renderCurrentPage();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (readerContainer.style.display !== 'none') {
            if (e.key === 'ArrowLeft') prevPageButton.click();
            if (e.key === 'ArrowRight') nextPageButton.click();
        }
    });
}

/**
 * 打开阅读器
 */
function openComicReader(comic) {
    currentComic = comic;
    currentPageIndex = 0;
    currentComicTitleSpan.textContent = comic.title;
    totalPagesSpan.textContent = comic.pages.length;
    renderCurrentPage();
    
    document.getElementById('comic-list-container').style.display = 'none';
    readerContainer.style.display = 'flex';
}

function showComicList() {
    document.getElementById('comic-list-container').style.display = 'block';
    readerContainer.style.display = 'none';
    currentComic = null;
    currentPageIndex = 0;
}

function renderCurrentPage() {
    if (!currentComic || currentPageIndex >= currentComic.pages.length) return;

    const url = currentComic.pages[currentPageIndex];
    currentPageImage.src = url;
    currentPageImage.alt = `${currentComic.title} 第 ${currentPageIndex + 1} 页`;
    currentPageSpan.textContent = currentPageIndex + 1;
    prevPageButton.disabled = currentPageIndex === 0;
    nextPageButton.disabled = currentPageIndex === currentComic.pages.length - 1;
}

// 🎯 重点：请务必修改这一行！
// 在你的 script.js 中找到：
// const COMIC_FOLDERS = ['wulanse']; 
// 确保它和你仓库里的文件夹名完全一致（大小写也要一致！）
