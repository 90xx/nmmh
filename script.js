// === 配置：请确保这里是你实际的漫画文件夹名 ===
const COMIC_FOLDERS = ['wulanse']; // ← 修改为你自己的文件夹名（小写！）

// DOM 元素
const comicListContainer = document.getElementById('comic-list');
const comicDetailContainer = document.getElementById('comic-detail-container');
const backToListBtn = document.getElementById('back-to-list');
const comicPagesContainer = document.getElementById('comic-pages'); // 用于显示所有图片
const comicTitleEl = document.getElementById('comic-title');

// 全局变量
let currentComic = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await loadComics();
    setupEventListeners();
});

// 加载所有漫画（自动扫描文件夹中的 .jpg）
async function loadComics() {
    comicListContainer.innerHTML = '<p>正在扫描漫画...</p>';

    try {
        const comics = [];
        for (const folder of COMIC_FOLDERS) {
            const pages = await scanFolderForJpg(folder);
            if (pages.length > 0) {
                comics.push({
                    id: folder,
                    title: folder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    pages: pages
                });
            }
        }

        if (comics.length === 0) {
            comicListContainer.innerHTML = `
                <p>❌ 未找到任何 JPG 图片。</p>
                <p>请检查：</p>
                <ul>
                    <li>文件夹名是否正确？当前配置：<code>${COMIC_FOLDERS.join(', ')}</code></li>
                    <li>图片是否为小写 <code>.jpg</code>（不是 .JPG）</li>
                    <li>路径是否为：<code>comics/${COMIC_FOLDERS[0]}/132.jpg</code> 等</li>
                </ul>
            `;
            return;
        }

        renderComicList(comics);
    } catch (err) {
        console.error('加载失败:', err);
        comicListContainer.innerHTML = `<p>⚠️ 加载错误：${err.message}</p>`;
    }
}

// 扫描单个文件夹中的所有 .jpg 文件（按数字排序）
async function scanFolderForJpg(folderName) {
    const pages = [];
    const base = `comics/${folderName}`;

    // 尝试常见编号范围（100~300），避免无限循环
    // 使用连续缺失计数法来决定何时停止扫描
    let consecutiveMissing = 0;
    let currentPageNum = 100; // 可以根据你的实际起始页调整

    while (consecutiveMissing < 5 && currentPageNum <= 300) { // 连续5个找不到就停
        const filename = `${currentPageNum}.jpg`;
        const url = `${base}/${filename}`;

        if (await imageExists(url)) {
            pages.push({ url, number: currentPageNum, filename });
            consecutiveMissing = 0; // 找到了，重置计数器
        } else {
            consecutiveMissing++; // 没找到，计数器+1
        }

        currentPageNum++;
    }

    // 按页码数字排序
    return pages.sort((a, b) => a.number - b.number);
}

// 检查图片是否存在的更可靠方法 (使用 Image 对象)
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // 检查图片是否真的有宽度和高度（确保不是空图片或占位符）
            if (img.width > 0 && img.height > 0) {
                resolve(true); // 图片存在且有效
            } else {
                resolve(false); // 图片加载了但尺寸为0，可能无效
            }
        };
        img.onerror = () => {
            resolve(false); // 图片加载失败，表示不存在
        };
        // 添加时间戳参数以绕过浏览器缓存
        img.src = url + '?t=' + new Date().getTime();
    });
}

// 渲染漫画列表
function renderComicList(comics) {
    comicListContainer.innerHTML = '';

    comics.forEach(comic => {
        const item = document.createElement('div');
        item.className = 'comic-item';
        item.dataset.folder = comic.id;

        // 取第1张图作为封面（如果存在）
        const coverUrl = comic.pages.length > 0
            ? comic.pages[0].url
            : `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22200%22 viewBox=%220 0 160 200%22%3E%3Crect width=%22160%22 height=%22200%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2250%22 y=%22100%22 font-size=%2214%22 fill=%22%23999%22%3E无图%3C/text%3E%3C/svg%3E`;

        item.innerHTML = `
            <img src="${coverUrl}" alt="${comic.title} 封面" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22200%22 viewBox=%220 0 160 200%22%3E%3Crect width=%22160%22 height=%22200%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2250%22 y=%22100%22 font-size=%2214%22 fill=%22%23999%22%3E%E6%97%A0%E5%9B%BE%3C/text%3E%3C/svg%3E';">
            <h3>${comic.title}</h3>
        `;

        item.addEventListener('click', () => showComicDetail(comic));
        comicListContainer.appendChild(item);
    });
}

// 显示漫画详情页（显示所有图片）
function showComicDetail(comic) {
    currentComic = comic;
    comicTitleEl.textContent = comic.title;
    comicPagesContainer.innerHTML = ''; // 清空容器

    comic.pages.forEach(page => {
        const imgElement = document.createElement('img');
        imgElement.className = 'comic-page-image'; // 添加CSS类
        imgElement.src = page.url;
        imgElement.alt = `第 ${page.number} 页`;
        imgElement.loading = 'lazy'; // 可选：启用懒加载，提升性能

        // 可选：添加页码标签
        const labelDiv = document.createElement('div');
        labelDiv.className = 'page-number-label';
        labelDiv.textContent = `第 ${page.number} 页`;

        comicPagesContainer.appendChild(labelDiv);
        comicPagesContainer.appendChild(imgElement);
    });

    // 切换视图
    document.getElementById('comic-list-container').style.display = 'none';
    comicDetailContainer.style.display = 'block';
}

// 返回列表
function backToList() {
    document.getElementById('comic-list-container').style.display = 'block';
    comicDetailContainer.style.display = 'none';
    currentComic = null;
    comicPagesContainer.innerHTML = ''; // 清理图片，释放内存
}

// 事件监听
function setupEventListeners() {
    backToListBtn.addEventListener('click', backToList);

    // 键盘快捷键（可选）
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && comicDetailContainer.style.display === 'block') {
            backToList();
        }
    });
}
