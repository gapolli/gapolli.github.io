function revealEmail(event) {
    event.preventDefault();
    const email = 'gapolli' + '@yahoo.com.br';
    window.location.href = 'mailto:' + email;
}

let allRepositories = [];
let activeFilter = 'All';
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
        const card = document.createElement('div');
        card.className = "custom-card p-6 rounded-2xl flex flex-col justify-between shadow-lg";

        const tagsHTML = repo.topics && repo.topics.length > 0
            ? repo.topics.slice(0, 4).map(t => `<span class="bg-blue-950 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-800">${escapeHTML(t)}</span>`).join('')
            : `<span class="bg-slate-800 text-gray-400 text-[10px] font-mono px-2 py-0.5 rounded">${escapeHTML(repo.language || 'Code')}</span>`;

        const safeName = escapeHTML(repo.name);
        const safeUrl = encodeURI(repo.html_url || '#');
        const safeDesc = escapeHTML(repo.description || 'No specialized engineering description provided for this repository yet.');
        const safeLang = escapeHTML(repo.language || 'Multi');

        card.innerHTML = `
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <h3 class="text-base font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a>
                            </h3>
                            <span class="text-xs text-gray-400 font-mono">⭐ ${repo.stargazers_count}</span>
                        </div>
                        <p class="text-gray-300 text-xs leading-relaxed line-clamp-4 mb-4">
                            ${safeDesc}
                        </p>
                    </div>
                    <div>
                        <div class="flex flex-wrap gap-1.5 mb-4">
                            ${tagsHTML}
                        </div>
                        <div class="text-[10px] text-gray-400 font-mono flex justify-between items-center pt-2 border-t border-gray-700">
                            <span>Engine: <strong class="text-white">${safeLang}</strong></span>
                            <span>Refactored: ${new Date(repo.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                `;
        reposContainer.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', fetchGitHubPortfolio);