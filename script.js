// === 配置：请确保这里是你实际的漫画文件夹名 ===
const COMIC_FOLDERS = ['wulanse']; // ← 修改为你自己的文件夹名（小写！）

// DOM 元素
const comicListContainer = document.getElementById('comic-list');
const comicDetailContainer = document.getElementById('comic-detail-container');
const backToListBtn = document.getElementById('back-to-list');
const thumbnailGrid = document.getElementById('thumbnail-grid');
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
    for (let i = 100; i <= 300; i++) {
        const filename = `${i}.jpg`;
        const url = `${base}/${filename}`;
        
        if (await imageExists(url)) {
            pages.push({ url, number: i, filename });
        } else {
            // 连续 5 个不存在就停止（提高效率）
            let missingCount = 0;
            for (let j = 1; j <= 5; j++) {
                if (!await imageExists(`${base}/${i+j}.jpg`)) missingCount++;
                else break;
            }
            if (missingCount >= 5) break;
        }
    }

    // 按页码数字排序
    return pages.sort((a, b) => a.number - b.number);
}

// 检查图片是否存在
function imageExists(url) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
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
            <img src="${coverUrl}" alt="${comic.title} 封面" onerror="this.src='data:image/svg+xml,%3Csvg...';">
            <h3>${comic.title}</h3>
        `;
        
        item.addEventListener('click', () => showComicDetail(comic));
        comicListContainer.appendChild(item);
    });
}

// 显示漫画详情页（缩略图网格）
function showComicDetail(comic) {
    currentComic = comic;
    comicTitleEl.textContent = comic.title;
    thumbnailGrid.innerHTML = '';

    comic.pages.forEach(page => {
        const item = document.createElement('div');
        item.className = 'thumbnail-item';
        item.dataset.url = page.url;

        item.innerHTML = `
            <img class="thumbnail-img" src="${page.url}" alt="第 ${page.number} 页" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22180%22 viewBox=%220 0 140 180%22%3E%3Crect width=%22140%22 height=%22180%22 fill=%22%23f8f9fa%22/%3E%3Ctext x=%2235%22 y=%2290%22 font-size=%2212%22 fill=%22%23aaa%22%3E${page.number}%3C/text%3E%3C/svg%3E'">
            <div class="thumbnail-label">${page.number}</div>
        `;

        // 可选：点击放大（弹窗或新标签页）
        item.addEventListener('click', () => {
            window.open(page.url, '_blank');
        });

        thumbnailGrid.appendChild(item);
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
