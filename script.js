// --- 配置区域 ---
// 请在此处配置你的漫画数据
// 每个漫画对象包含：id (唯一标识), title (标题), cover (封面图片路径), pages (页面图片路径数组)
const COMICS = [
    {
        id: 'example_comic',
        title: '示例漫画',
        cover: 'path/to/cover.jpg', // 替换为你的封面图片路径
        pages: [
            'path/to/page1.jpg', // 替换为你的页面图片路径
            'path/to/page2.jpg',
            'path/to/page3.jpg'
        ]
    },
    // 添加更多漫画...
    // {
    //     id: 'another_comic',
    //     title: '另一部漫画',
    //     cover: 'path/to/another_cover.jpg',
    //     pages: ['path/to/another_page1.jpg', 'path/to/another_page2.jpg']
    // }
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

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadComicList();
    setupEventListeners();
});

// --- 函数定义 ---

/**
 * 加载并显示漫画列表
 */
function loadComicList() {
    if (!comicListContainer) return;

    // 清空现有列表
    comicListContainer.innerHTML = '';

    if (COMICS.length === 0) {
        comicListContainer.innerHTML = '<p>暂无漫画数据，请在 script.js 中配置 COMICS 数组。</p>';
        return;
    }

    // 为每部漫画创建一个项目元素
    COMICS.forEach(comic => {
        const comicItem = document.createElement('div');
        comicItem.className = 'comic-item';
        comicItem.dataset.id = comic.id; // 使用 data-id 存储漫画ID

        comicItem.innerHTML = `
            <img src="${comic.cover}" alt="${comic.title} 封面">
            <h3>${comic.title}</h3>
        `;

        // 添加点击事件监听器
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
    readerContainer.style.display = 'flex'; // 使用flex以正确显示内部布局
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
