// --- 配置区域 ---
// 只需确保你的漫画放在 comics/ 子文件夹中，如: comics/ningmengmanhua/
const COMIC_ROOT = 'comics';

// --- DOM元素引用 ---
const comicListContainer = document.getElementById('comic-list');
const uploadedComicList = document.getElementById('uploaded-comic-list');
const readerContainer = document.getElementById('reader-container');
const backToListButton = document.getElementById('back-to-list');
const currentComicTitleSpan = document.getElementById('current-comic-title');

// 新增：用于存放所有图片的容器
const allPagesContainer = document.getElementById('all-pages-container');

// --- 全局变量 ---
let currentComic = null;
let currentPageIndex = 0; // 保留这个变量，可能后续有用
let allComics = []; // GitHub Pages 漫画
let uploadedComics = []; // 上传的漫画

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadComicsAutomatically();
    setupEventListeners();
    setupUploadListener();
});

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
                // 按文件名数字排序
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
                    isUploaded: true // 标记为上传漫画
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

        // 创建封面图片（对于上传的漫画）
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

    // 清空旧内容
    allPagesContainer.innerHTML = '';

    // 渲染上传漫画的所有页面
    comic.pages.forEach((file, pageIndex) => {
        const imgElement = document.createElement('img');
        imgElement.src = URL.createObjectURL(file);
        imgElement.alt = `${comic.title} 第 ${pageIndex + 1} 页`;
        imgElement.className = 'all-pages-image';
        imgElement.loading = 'lazy';

        // 创建页码标签（保持你原有的醒目样式）
        const labelElement = document.createElement('div');
        labelElement.className = 'page-number-label';
        labelElement.textContent = `第 ${pageIndex + 1} 页`;

        allPagesContainer.appendChild(labelElement);
        allPagesContainer.appendChild(imgElement);
    });

    // 显示阅读器
    document.getElementById('comic-list-container').style.display = 'block';
    readerContainer.style.display = 'block';
    document.getElementById('reader-controls').style.display = 'none';
    document.getElementById('comic-display-area').style.display = 'none';
    allPagesContainer.style.display = 'block';
}

/**
 * 自动加载所有漫画：扫描 comics/ 下的每个子文件夹，收集 .jpg 文件
 */
async function loadComicsAutomatically() {
    if (!comicListContainer) return;

    comicListContainer.innerHTML = '<p>正在扫描 GitHub 漫画...</p>';

    try {
        const comicFolders = await getComicFolderNames();
        if (comicFolders.length === 0) {
            comicListContainer.innerHTML = `
                <p>⚠️ 未检测到漫画文件夹。</p>
                <p>请确保：</p>
                <ul>
                    <li>你的漫画图片放在 <code>comics/你的文件夹名/</code> 下（如 <code>comics/ningmengmanhua/</code>）</li>
                    <li>图片格式为 .jpg 或 .jpeg（大小写不敏感）</li>
                    <li>在下方代码中将 <code>COMIC_FOLDERS</code> 改为你的文件夹名，例如：<br>
                        <code>const COMIC_FOLDERS = ['ningmengmanhua'];</code>
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
const COMIC_FOLDERS = ['雾蓝色的雨后晴天']; // ← 修改这里！

/**
 * 获取用户配置的漫画文件夹名列表
 */
async function getComicFolderNames() {
    return COMIC_FOLDERS;
}

/**
 * 检查图片是否存在（通过创建 Image 对象），带超时保护
 * @param {string} url
 * @returns {Promise<boolean>}
 */
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        let resolved = false;

        // ✅ 超时保护：3秒后强制返回 false
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.warn(`[imageExists] 超时（3s），URL: ${url}`);
                resolve(false);
            }
        }, 3000);

        img.onload = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                // 额外验证：确保图片尺寸 > 0（排除空文件）
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    resolve(true);
                } else {
                    console.warn(`[imageExists] 图片加载成功但尺寸为 0: ${url}`);
                    resolve(false);
                }
            }
        };

        img.onerror = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                console.debug(`[imageExists] 加载失败: ${url}`);
                resolve(false);
            }
        };

        img.src = url;
    });
}

/**
 * 从单个文件夹构建漫画对象（终极动态扫描：支持任意起始页码、前导零、无预设范围）
 * @param {string} folderName - 文件夹名，如 'ningmengmanhua'
 * @returns {Object|null}
 */
async function buildComicFromFolder(folderName) {
    try {
        const baseDir = `${COMIC_ROOT}/${folderName}`;
        const pages = new Set(); // 使用 Set 避免重复

        // ✅ 生成所有可能的文件名候选（支持前导零、任意起始页）
        const candidates = [];

        // 生成 1~999 的所有可能格式：
        // - 1.jpg, 2.jpg, ..., 999.jpg
        // - 01.jpg, 02.jpg, ..., 99.jpg
        // - 001.jpg, 002.jpg, ..., 999.jpg
        // 同时包括 .jpeg
        for (let i = 1; i <= 9999; i++) {
            const str = i.toString();
            candidates.push(
                `${str}.jpg`,
                `${str.padStart(2, '0')}.jpg`, // 01.jpg
                `${str.padStart(3, '0')}.jpg`, // 001.jpg
                 `${str.padStart(4, '0')}.jpg`,   // ← 新增这一行
                `${str}.jpeg`,
                `${str.padStart(2, '0')}.jpeg`,
                `${str.padStart(3, '0')}.jpeg`,
                `${str.padStart(4, '0')}.jpeg`
            );
        }

        // 去重（理论上不会有重复，但保险起见）
        const uniqueCandidates = [...new Set(candidates)];

        // ✅ 并行探测所有候选文件（限制并发数，避免卡顿）
        const BATCH_SIZE = 20; // 每批最多 20 个并发请求
        for (let i = 0; i < uniqueCandidates.length; i += BATCH_SIZE) {
            const batch = uniqueCandidates.slice(i, i + BATCH_SIZE);
            const promises = batch.map(async (filename) => {
                const url = `${baseDir}/${filename}`;
                if (await imageExists(url)) {
                    pages.add(url);
                    console.log(`✅ 找到图片: ${url}`);
                }
            });
            await Promise.all(promises);
        }

        if (pages.size === 0) {
            console.warn(`未在 ${folderName} 中找到任何图片`);
            return null;
        }

        // ✅ 按文件名中的数字部分排序（而非字符串排序）
        const sortedPages = Array.from(pages).sort((a, b) => {
            const numA = parseInt(a.match(/\/(\d+)\./)[1]) || 0;
            const numB = parseInt(b.match(/\/(\d+)\./)[1]) || 0;
            return numA - numB;
        });

        return {
            id: folderName,
            title: folderName.charAt(0).toUpperCase() + folderName.slice(1),
            cover: sortedPages[0],
            pages: sortedPages,
            isUploaded: false // 标记为 GitHub 漫画
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
    comicListContainer.innerHTML = '<h2>📚 GitHub 漫画</h2><div id="github-comics"></div>';

    const githubComicsContainer = document.getElementById('github-comics');
    
    if (allComics.length === 0) {
        githubComicsContainer.innerHTML = `
            <p>❌ 未找到任何漫画。</p>
            <p><strong>请立即检查：</strong></p>
            <ol>
                <li>在 <code>script.js</code> 第 76 行，将 <code>const COMIC_FOLDERS = ['ningmengmanhua'];</code> 中的 <code>ningmengmanhua</code> 改为你实际的文件夹名（你截图中确实是 <code>ningmengmanhua</code>，所以这步应该已完成）</li>
                <li>确认图片文件名是小写 <code>.jpg</code>（不是 .JPG）</li>
                <li>图片必须在 <code>comics/ningmengmanhua/132.jpg</code> 这样的路径下</li>
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
        githubComicsContainer.appendChild(comicItem);
    });

    // 重新渲染上传的漫画列表
    renderUploadedComics();
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
        // 对于上传的漫画，pageUrl 是 File 对象；对于 GitHub 漫画，pageUrl 是字符串 URL
        if (comic.isUploaded) {
            imgElement.src = URL.createObjectURL(pageUrl);
        } else {
            imgElement.src = pageUrl;
        }
        
        // 从 URL 中提取原始编号作为 alt 和页码标签
        let pageNumber = 'Unknown';
        if (comic.isUploaded) {
            // 上传漫画：按数组索引
            const pageIndex = comic.pages.indexOf(pageUrl);
            pageNumber = (pageIndex + 1).toString();
        } else {
            // GitHub 漫画：从 URL 提取数字
            const filenameMatch = pageUrl.match(/\/(\d+)\.\w+$/); // 匹配 /132.jpg 中的 132
            pageNumber = filenameMatch ? filenameMatch[1] : 'Unknown';
        }
        
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
    document.getElementById('comic-list-container').style.display = 'block';
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
// const COMIC_FOLDERS = ['ningmengmanhua'];
// 确保它和你仓库里的文件夹名完全一致（大小写也要一致！）
