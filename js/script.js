function revealEmail(event) {
    event.preventDefault();
    const email = 'gapolli' + '@yahoo.com.br';
    window.location.href = 'mailto:' + email;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCloneModal();
});

let allRepositories = [];
let activeFilter = 'All';
let cloneModal = null;
const excludedRepoNames = ['gapolli'];

function escapeHTML(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

async function fetchGitHubPortfolio() {
    const reposContainer = document.getElementById('repos-container');
    const loadingElement = document.getElementById('loading');
    const statsContainer = document.getElementById('profile-stats');

    try {
        const response = await fetch('./repos.json');
        if (!response.ok) throw new Error('Cache missing');

        const data = await response.json();
        const profile = data.profile;
        allRepositories = data.repositories;

        statsContainer.innerHTML = `
                    <div>
                        <h4 class="font-bold text-blue-400 mb-2 border-b border-gray-700 pb-1 flex items-center gap-2">📊 GitHub Metrics</h4>
                        <div class="space-y-1 text-gray-300 font-mono text-xs">
                            <div>• Public Repos: <span class="text-white font-bold">${profile.public_repos || 0}</span></div>
                            <div>• Followers: <span class="text-emerald-400 font-bold">${profile.followers || 0}</span></div>
                            <div>• Location: <span class="text-gray-300">Limeira, SP, BR</span></div>
                        </div>
                    </div>
                    <div id="lastfm-widget" class="pt-2 border-t border-gray-800">
                        <span class="text-gray-500 font-mono text-[10px] animate-pulse">Processing cached soundtrack...</span>
                    </div>
                `;

        renderLastFMTrack(data.lastfm_track);

        allRepositories = allRepositories.filter(repo =>
            repo &&
            !repo.fork &&
            !repo.archived &&
            !excludedRepoNames.includes(repo.name) &&
            !repo.name.endsWith('.github.io')
        );

        loadingElement.classList.add('hidden');

        if (allRepositories.length === 0) {
            loadingElement.innerHTML = `<span class="text-gray-500 font-mono text-xs">No active repositories found in cache.</span>`;
            return;
        }

        renderFilterButtons();
        renderCards();

    } catch (error) {
        console.error(error);
        loadingElement.innerHTML = `<span class="text-red-400 font-mono text-xs">Error parsing repository assets.</span>`;
    }
}

function renderLastFMTrack(lastfmData) {
    const widget = document.getElementById('lastfm-widget');
    try {
        const recentTracks = lastfmData?.recenttracks?.track;

        if (!recentTracks || (Array.isArray(recentTracks) && recentTracks.length === 0)) {
            widget.innerHTML = `<span class="text-gray-600 font-mono text-[10px]">No tracks found for user 'gapolli'</span>`;
            return;
        }

        const track = Array.isArray(recentTracks) ? recentTracks[0] : recentTracks;

        if (!track || !track.name || !track.artist) {
            widget.innerHTML = `<span class="text-gray-600 font-mono text-[10px]">Incomplete track data</span>`;
            return;
        }

        const isPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';
        const trackName = escapeHTML(track.name);
        const artistName = escapeHTML(track.artist['#text']);

        widget.innerHTML = `
                    <h4 class="font-bold text-red-400 mb-2 flex items-center gap-1.5 text-xs">
                        <span class="flex h-2 w-2 relative">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isPlaying ? 'bg-red-400' : 'bg-gray-500'} opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-red-500' : 'bg-gray-600'}"></span>
                        </span>
                        ${isPlaying ? 'Now Playing' : 'Last Scrobble'} (Last.fm)
                    </h4>
                    <div class="text-gray-300 font-sans text-xs font-medium truncate max-w-[220px]" title="${trackName}">
                        🎵 ${trackName}
                    </div>
                    <div class="text-gray-400 font-mono text-[10px] truncate max-w-[220px]">
                        by ${artistName}
                    </div>
                `;
    } catch (e) {
        console.error(e);
        widget.innerHTML = `<span class="text-gray-600 font-mono text-[10px]">Last.fm cache empty</span>`;
    }
}

function renderFilterButtons() {
    const languages = new Set();
    allRepositories.forEach(repo => { if (repo.language) languages.add(repo.language); });
    const filterOptions = ['All', ...Array.from(languages).sort()];
    const headerSection = document.querySelector('section h2');

    const oldBar = document.getElementById('filter-bar');
    if (oldBar) oldBar.remove();

    const filterBar = document.createElement('div');
    filterBar.id = 'filter-bar';
    filterBar.className = "flex flex-wrap gap-2 mb-8";

    filterOptions.forEach(lang => {
        const btn = document.createElement('button');
        btn.textContent = lang;
        btn.className = getButtonStyles(lang === activeFilter);
        btn.addEventListener('click', () => {
            activeFilter = lang;
            renderFilterButtons();
            renderCards();
        });
        filterBar.appendChild(btn);
    });
    headerSection.insertAdjacentElement('afterend', filterBar);
}

function getButtonStyles(isActive) {
    const base = "text-xs font-mono px-4 py-2 rounded-xl transition-all duration-200 border cursor-pointer ";
    return isActive
        ? base + "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 font-bold"
        : base + "bg-gray-900/60 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200";
}

function renderCards() {
    const reposContainer = document.getElementById('repos-container');
    reposContainer.classList.remove('hidden');
    reposContainer.innerHTML = '';

    const filteredRepos = activeFilter === 'All'
        ? allRepositories
        : allRepositories.filter(repo => repo.language === activeFilter);

    if (filteredRepos.length === 0) {
        reposContainer.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 font-mono text-xs">No repositories found matching this language setup.</div>`;
        return;
    }

    filteredRepos.forEach(repo => {
        const safeName = escapeHTML(repo.name);
        const safeUrl = encodeURI(repo.html_url || '#');
        const forkUrl = `${repo.html_url}/fork`;
        const cloneUrl = repo.clone_url || repo.html_url + '.git';
        const safeDesc = escapeHTML(repo.description || 'No specialized engineering description provided for this repository yet.');
        const safeLang = escapeHTML(repo.language || 'Multi');

        const tagsHTML = repo.topics && repo.topics.length > 0
            ? repo.topics.slice(0, 4).map(t => `<span class="bg-blue-950 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-800">${escapeHTML(t)}</span>`).join('')
            : `<span class="bg-slate-800 text-gray-400 text-[10px] font-mono px-2 py-0.5 rounded">${escapeHTML(repo.language || 'Code')}</span>`;

        const card = document.createElement('div');
        card.className = "custom-card p-6 rounded-2xl flex flex-col justify-between shadow-lg";

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                    <h3 class="text-base font-bold text-blue-400 hover:text-blue-300 transition-colors">
                        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a>
                    </h3>
                    <div class="flex items-center gap-1.5">
                        <!-- Star -->
                        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                           class="flex items-center gap-1 text-xs text-yellow-500 hover:text-yellow-400 transition-colors group"
                           title="Star this repository on GitHub">
                            <svg class="w-3 h-3 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 16 16">
                                <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                            </svg>
                            <span>${repo.stargazers_count}</span>
                        </a>

                        <!-- Fork -->
                        <a href="${forkUrl}" target="_blank" rel="noopener noreferrer"
                           class="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors group"
                           title="Fork this repository on GitHub">
                            <svg class="w-3 h-3 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
                            </svg>
                            <span>${repo.forks_count}</span>
                        </a>

                        <!-- Clone -->
                        <button onclick="openCloneModal('${cloneUrl}', '${safeName}')"
                                class="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors group"
                                title="Clone this repository">
                            <svg class="w-3 h-3 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 16 16">
                                <path d="M2.75 2.5a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0V6.25h5.25a.75.75 0 000-1.5h-5.25v2.25zM8 1.75a2.25 2.25 0 00-2.25 2.25v6.5a2.25 2.25 0 002.25 2.25h6.5a2.25 2.25 0 002.25-2.25V4a2.25 2.25 0 00-2.25-2.25H8zm-1.5 4.75a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5H7.25a.75.75 0 01-.75-.75zM7.25 9a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5H7.25zm.75 2.25a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5H8.75a.75.75 0 01-.75-.75z"/>
                            </svg>
                            <span>Clone</span>
                        </button>
                    </div>
                </div>
                <p class="text-gray-300 text-xs leading-relaxed line-clamp-4 mb-4">
                    ${safeDesc}
                </p>
            </div>
            <div>
                <div class="flex flex-wrap gap-1.5 mb-4">
                    ${tagsHTML}
                </div>
                ${
                    repo.has_pages
                        ? `<a href="https://gapolli.github.io/${repo.name}/" target="_blank" rel="noopener noreferrer"
                               class="inline-block mb-4 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors border border-blue-800 hover:border-blue-600 rounded px-3 py-1.5">
                               🚀 View Demo
                           </a>`
                        : ''
                }
                <div class="text-[10px] text-gray-400 font-mono flex justify-between items-center pt-2 border-t border-gray-700">
                    <span>Engine: <strong class="text-white">${safeLang}</strong></span>
                    <span>Refactored: ${new Date(repo.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>
        `;
        reposContainer.appendChild(card);
    });
}

function openCloneModal(repoUrl, repoName) {
    if (!cloneModal) {
        cloneModal = document.getElementById('clone-modal');
    }

    if (cloneModal) {
        document.getElementById('clone-url').textContent = repoUrl;
        document.getElementById('clone-repo-name').textContent = repoName;
        cloneModal.classList.remove('hidden');
    }
}

// Função para fechar modal
function closeCloneModal() {
    if (cloneModal) {
        cloneModal.classList.add('hidden');
    }
}

// Função para copiar URL de clone
function copyCloneUrl() {
    const urlText = document.getElementById('clone-url').textContent;
    navigator.clipboard.writeText(urlText).then(() => {
        const btn = document.getElementById('copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied! ✓';
        btn.classList.add('text-green-400');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('text-green-400');
        }, 2000);
    });
}

document.addEventListener('DOMContentLoaded', fetchGitHubPortfolio);
