// --- 配置区域 ---
// 定义漫画所在的文件夹名称
const COMIC_FOLDERS = [
    'one-piece',    // 示例：海贼王文件夹
    'naruto',       // 示例：火影忍者文件夹
    'dragon-ball',  // 示例：龙珠文件夹
    // 添加更多你的漫画文件夹名称
];

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
let allComics = []; // 存储检测到的所有漫画信息

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    detectAllComics();
    setupEventListeners();
});

/**
 * 自动检测所有漫画文件夹
 */
async function detectAllComics() {
    if (!comicListContainer) return;

    comicListContainer.innerHTML = '<p>正在扫描漫画...</p>';

    try {
        for (const folderName of COMIC_FOLDERS) {
            const comicInfo = await getComicInfo(folderName);
            if (comicInfo && comicInfo.pages.length > 0) {
                allComics.push(comicInfo);
            }
        }

        if (allComics.length === 0) {
            comicListContainer.innerHTML = '<p>未找到任何漫画文件夹或漫画图片，请检查文件夹名称和图片格式是否正确。</p>';
            return;
        }

        renderComicList();
    } catch (error) {
        console.error('检测漫画时出错:', error);
        comicListContainer.innerHTML = '<p>扫描漫画时出现错误，请刷新页面重试。</p>';
    }
}

/**
 * 获取单个漫画文件夹的信息
 * @param {string} folderName - 漫画文件夹名称
 * @returns {Object|null} - 漫画信息对象或null
 */
async function getComicInfo(folderName) {
    try {
        // 获取文件夹中的所有图片
        const pages = await scanComicFolder(folderName);
        
        if (pages.length === 0) {
            return null; // 如果没有找到图片，则返回null
        }

        // 选择第一张图片作为封面，如果没有则使用默认图片
        let coverPath = pages[0]; // 使用第一张图片作为封面
        
        return {
            id: folderName,
            title: folderName.replace(/-/g, ' '), // 将连字符替换为空格作为标题
            cover: coverPath,
            pages: pages
        };
    } catch (error) {
        console.error(`获取漫画 "${folderName}" 信息时出错:`, error);
        return null;
    }
}

/**
 * 扫描漫画文件夹中的所有JPG图片
 * @param {string} folderName - 漫画文件夹名称
 * @returns {Array} - 图片路径数组
 */
async function scanComicFolder(folderName) {
    const pages = [];
    
    try {
        // 构建漫画文件夹的URL
        const folderUrl = `comics/${folderName}`;
        
        // 尝试获取文件夹下的文件列表
        // 由于GitHub Pages是静态网站，我们需要预设可能的图片文件名
        // 这里我们采用另一种策略：尝试请求可能存在的图片文件
        
        // 为了更高效，我们可以设定一个范围，比如从1.jpg到999.jpg
        // 但更实际的方法是列出你知道的文件名
        // 或者使用GitHub API获取仓库内容（但这需要额外设置）
        
        // 对于静态网站，我们采用一种变通方法：
        // 用户需要在script.js中手动列出可能的文件名或使用某种模式
        // 或者我们尝试通过一个JSON文件来描述漫画内容
        
        // 为了让自动检测可行，我们使用一个替代方案：
        // 假设你在一个json文件中列出了每个文件夹中的图片文件名
        const manifestUrl = `comics/${folderName}/manifest.json`;
        
        try {
            const response = await fetch(manifestUrl);
            if (response.ok) {
                const manifest = await response.json();
                if (Array.isArray(manifest.pages)) {
                    return manifest.pages.map(page => `comics/${folderName}/${page}`);
                }
            }
        } catch (e) {
            console.warn(`未能加载 ${folderName} 的 manifest.json，将尝试其他方式`);
        }
        
        // 如果没有manifest.json，我们尝试通过一个预定义的文件名列表来检测
        // 由于无法直接列出文件夹内容，我们只能使用这种方法
        // 你可以在下面的代码中添加更多常见的文件名模式
        // 例如: 1.jpg, 001.jpg, 0001.jpg, page1.jpg 等
        
        // 为了使此功能在静态环境下工作，我们将使用一个不同的方法
        // 创建一个JSON文件来描述每个漫画文件夹的内容
        // 但这里先返回一个空数组，表示需要手动配置
        console.log(`请为 ${folderName} 创建一个 manifest.json 文件来列出图片文件`);
        return []; 
    } catch (error) {
        console.error(`扫描漫画文件夹 "${folderName}" 时出错:`, error);
        return [];
    }
}

/**
 * 渲染漫画列表
 */
function renderComicList() {
    comicListContainer.innerHTML = '';

    if (allComics.length === 0) {
        comicListContainer.innerHTML = '<p>没有找到任何漫画。</p>';
        return;
    }

    allComics.forEach(comic => {
        const comicItem = document.createElement('div');
        comicItem.className = 'comic-item';
        comicItem.dataset.id = comic.id;

        comicItem.innerHTML = `
            <img src="${comic.cover}" alt="${comic.title} 封面">
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
    // 返回列表按钮
    backToListButton.addEventListener('click', showComicList);

    // 上一页按钮
    prevPageButton.addEventListener('click', () => {
        if (currentPageIndex > 0) {
            currentPageIndex--;
            renderCurrentPage();
        }
    });

    // 下一页按钮
    nextPageButton.addEventListener('click', () => {
        if (currentComic && currentPageIndex < currentComic.pages.length - 1) {
            currentPageIndex++;
            renderCurrentPage();
        }
    });

    // 键盘事件监听 (左右箭头键翻页)
    document.addEventListener('keydown', (event) => {
        if(readerContainer.style.display !== 'none') { // 只在阅读器显示时生效
            if (event.key === 'ArrowLeft') {
                prevPageButton.click(); // 触发上一页按钮点击
            } else if (event.key === 'ArrowRight') {
                nextPageButton.click(); // 触发下一页按钮点击
            }
        }
    });
}

/**
 * 打开漫画阅读器
 * @param {Object} comic - 漫画对象
 */
function openComicReader(comic) {
    currentComic = comic;
    currentPageIndex = 0; // 默认从第一页开始

    // 更新UI
    currentComicTitleSpan.textContent = comic.title;
    totalPagesSpan.textContent = comic.pages.length;

    // 渲染当前页面
    renderCurrentPage();

    // 切换显示
    document.getElementById('comic-list-container').style.display = 'none';
    readerContainer.style.display = 'flex';
}

/**
 * 显示漫画列表，隐藏阅读器
 */
function showComicList() {
    document.getElementById('comic-list-container').style.display = 'block';
    readerContainer.style.display = 'none';
    // 重置全局变量
    currentComic = null;
    currentPageIndex = 0;
}

/**
 * 渲染当前页面
 */
function renderCurrentPage() {
    if (!currentComic || !currentComic.pages[currentPageIndex]) {
        console.error("无法渲染页面：漫画数据或页面路径无效");
        return;
    }

    // 更新图片src
    currentPageImage.src = currentComic.pages[currentPageIndex];
    currentPageImage.alt = `${currentComic.title} 第 ${currentPageIndex + 1} 页`;

    // 更新页码显示
    currentPageSpan.textContent = currentPageIndex + 1;

    // 更新按钮状态
    prevPageButton.disabled = currentPageIndex === 0;
    nextPageButton.disabled = currentPageIndex === currentComic.pages.length - 1;
}

// --- 新增辅助函数：为没有manifest.json的用户提供手动配置选项 ---

/**
 * 生成manifest.json内容的辅助函数
 * 你可以使用这个函数来生成每个漫画文件夹的manifest.json文件内容
 */
function generateManifestContent(folderName, imageFileNames) {
    const manifest = {
        title: folderName.replace(/-/g, ' '),
        pages: imageFileNames.sort() // 排序确保正确的阅读顺序
    };
    
    console.log(`为文件夹 "${folderName}" 生成的 manifest.json 内容:`);
    console.log(JSON.stringify(manifest, null, 2));
    
    // 返回内容，你可以将其保存为 comics/folderName/manifest.json
    return JSON.stringify(manifest, null, 2);
}

// 示例：如何使用generateManifestContent
// 假设你在 one-piece 文件夹中有这些图片文件
// const onePieceFiles = ["001.jpg", "002.jpg", "132.jpg", "133.jpg", "cover.jpg"];
// const manifestJson = generateManifestContent("one-piece", onePieceFiles);
// console.log(manifestJson);
