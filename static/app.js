// JavaScript Application logic for BigQuery Release Notes Hub

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let rawReleases = [];
    let parsedUpdates = [];
    let filteredUpdates = [];
    let selectedUpdateId = null;
    let activeTypeFilter = 'all';
    let searchQuery = '';
    let sortOrder = 'newest';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const syncStatus = document.getElementById('sync-status');
    const statusText = syncStatus.querySelector('.status-text');
    const searchInput = document.getElementById('search-input');
    const typeFilters = document.getElementById('type-filters');
    const sortRadios = document.getElementsByName('sort-order');
    const resultsCount = document.getElementById('results-count');
    const feedContainer = document.getElementById('feed-container');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMsg = document.getElementById('error-msg');
    const retryBtn = document.getElementById('retry-btn');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const themeSwitch = document.getElementById('theme-switch');

    // Composer DOM Elements
    const selectionPreview = document.getElementById('selection-preview');
    const previewDetails = selectionPreview.querySelector('.preview-details');
    const previewPlaceholder = selectionPreview.querySelector('.preview-placeholder');
    const previewDate = document.getElementById('preview-date');
    const previewType = document.getElementById('preview-type');
    const previewTitle = document.getElementById('preview-title');
    const previewText = document.getElementById('preview-text');
    
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountSpan = document.getElementById('char-count');
    const charCounterWrapper = document.getElementById('char-counter');
    const tagChips = document.querySelector('.tag-chips');
    const tweetBtn = document.getElementById('tweet-btn');
    const clearComposerBtn = document.getElementById('clear-composer');
    const toast = document.getElementById('toast');

    // Category count elements
    const countAll = document.getElementById('count-all');
    const countFeature = document.getElementById('count-feature');
    const countFixed = document.getElementById('count-fixed');
    const countChanged = document.getElementById('count-changed');
    const countDeprecated = document.getElementById('count-deprecated');
    const countGeneral = document.getElementById('count-general');

    // ----------------------------------------------------
    // 1. Initialization and Theme Management
    // ----------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeSwitch.checked = false;
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeSwitch.checked = true;
        }
    }

    themeSwitch.addEventListener('change', () => {
        if (themeSwitch.checked) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    // ----------------------------------------------------
    // 2. Feed Fetching & Parsing
    // ----------------------------------------------------
    async function loadFeed() {
        showLoading(true);
        updateSyncStatus('loading', 'Syncing...');
        
        try {
            const response = await fetch('/api/releases');
            const data = await response.json();
            
            if (data.success && data.entries) {
                rawReleases = data.entries;
                parseUpdates(rawReleases);
                updateCategoryCounts();
                applyFiltersAndRender();
                
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                updateSyncStatus('online', `Synced at ${timeStr}`);
                showError(false);
            } else {
                throw new Error(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error(error);
            showError(true, error.message);
            updateSyncStatus('error', 'Sync Failed');
        } finally {
            showLoading(false);
        }
    }

    function updateSyncStatus(status, text) {
        syncStatus.className = `sync-status ${status}`;
        statusText.textContent = text;
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
        } else {
            loadingState.classList.add('hidden');
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    function showError(isError, message = '') {
        if (isError) {
            errorState.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
            errorMsg.textContent = message;
        } else {
            errorState.classList.add('hidden');
        }
    }

    // Parse the raw HTML feed content into individual updates
    function parseUpdates(entries) {
        parsedUpdates = [];
        let idCounter = 0;
        
        entries.forEach(entry => {
            const date = entry.title; // Feed entry titles are dates, e.g., "June 23, 2026"
            const link = entry.link;
            const contentHtml = entry.content;
            
            if (!contentHtml) return;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(contentHtml, 'text/html');
            const children = Array.from(doc.body.children);
            
            let currentType = 'General';
            let currentElements = [];
            
            const pushCurrentUpdate = () => {
                if (currentElements.length > 0) {
                    const html = currentElements.map(el => el.outerHTML).join('');
                    const text = currentElements.map(el => el.textContent.trim()).join(' ');
                    
                    // Generate a smart title/headline based on the first few words of content
                    let headText = "";
                    const firstP = currentElements.find(el => el.tagName === 'P');
                    if (firstP) {
                        const words = firstP.textContent.split(/\s+/).slice(0, 7).join(' ');
                        headText = words + (firstP.textContent.split(/\s+/).length > 7 ? '...' : '');
                    } else {
                        headText = text.substring(0, 45) + (text.length > 45 ? '...' : '');
                    }
                    
                    idCounter++;
                    parsedUpdates.push({
                        id: `update-${idCounter}`,
                        date: date,
                        rawDate: entry.updated || '',
                        type: currentType,
                        html: html,
                        text: text,
                        headline: headText,
                        link: link
                    });
                    
                    currentElements = [];
                }
            };
            
            children.forEach(child => {
                if (child.tagName === 'H3') {
                    // Push the previously built update before starting a new one
                    pushCurrentUpdate();
                    currentType = child.textContent.trim();
                } else {
                    currentElements.push(child);
                }
            });
            
            // Push final group
            pushCurrentUpdate();
        });
    }

    // Calculate update counts per category for the filter menu
    function updateCategoryCounts() {
        const counts = { all: 0, feature: 0, fixed: 0, changed: 0, deprecated: 0, general: 0 };
        
        parsedUpdates.forEach(update => {
            counts.all++;
            const typeKey = update.type.toLowerCase();
            if (counts.hasOwnProperty(typeKey)) {
                counts[typeKey]++;
            } else {
                counts.general++;
            }
        });

        countAll.textContent = counts.all;
        countFeature.textContent = counts.feature;
        countFixed.textContent = counts.fixed;
        countChanged.textContent = counts.changed;
        countDeprecated.textContent = counts.deprecated;
        countGeneral.textContent = counts.general;
    }

    // ----------------------------------------------------
    // 3. Filtering & Sorting Logic
    // ----------------------------------------------------
    function applyFiltersAndRender() {
        // Apply filter by category type
        let results = parsedUpdates.filter(update => {
            if (activeTypeFilter === 'all') return true;
            if (activeTypeFilter === 'general') {
                const standardTypes = ['feature', 'fixed', 'changed', 'deprecated'];
                return !standardTypes.includes(update.type.toLowerCase());
            }
            return update.type.toLowerCase() === activeTypeFilter;
        });

        // Apply filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            results = results.filter(update => {
                return update.text.toLowerCase().includes(query) || 
                       update.type.toLowerCase().includes(query) || 
                       update.date.toLowerCase().includes(query);
            });
        }

        // Apply sorting
        results.sort((a, b) => {
            const dateA = new Date(a.rawDate || a.date);
            const dateB = new Date(b.rawDate || b.date);
            
            // Fallback to simple comparison if parsing date fails
            if (isNaN(dateA) || isNaN(dateB)) {
                return sortOrder === 'newest' ? 
                    b.id.localeCompare(a.id) : 
                    a.id.localeCompare(b.id);
            }
            
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        filteredUpdates = results;
        resultsCount.textContent = filteredUpdates.length;

        // Render updates to HTML
        renderFeedList();
        renderActiveFilters();
    }

    // Render active filter badges
    function renderActiveFilters() {
        const activeFiltersList = document.getElementById('active-filters-list');
        activeFiltersList.innerHTML = '';

        if (activeTypeFilter !== 'all') {
            createFilterBadge(`Category: ${activeTypeFilter.charAt(0).toUpperCase() + activeTypeFilter.slice(1)}`, () => {
                activeTypeFilter = 'all';
                updateActiveFilterUI();
                applyFiltersAndRender();
            });
        }

        if (searchQuery) {
            createFilterBadge(`Search: "${searchQuery}"`, () => {
                searchQuery = '';
                searchInput.value = '';
                applyFiltersAndRender();
            });
        }
    }

    function createFilterBadge(text, onRemove) {
        const badge = document.createElement('div');
        badge.className = 'active-filter-badge';
        badge.innerHTML = `
            <span>${text}</span>
            <button>&times;</button>
        `;
        badge.querySelector('button').addEventListener('click', onRemove);
        document.getElementById('active-filters-list').appendChild(badge);
    }

    function updateActiveFilterUI() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            if (chip.getAttribute('data-type') === activeTypeFilter) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    // ----------------------------------------------------
    // 4. Rendering Feed Cards
    // ----------------------------------------------------
    function renderFeedList() {
        feedContainer.innerHTML = '';
        
        if (filteredUpdates.length === 0) {
            feedContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        feedContainer.classList.remove('hidden');

        filteredUpdates.forEach(update => {
            const card = document.createElement('article');
            const typeLower = update.type.toLowerCase();
            const isStandardType = ['feature', 'fixed', 'changed', 'deprecated'].includes(typeLower);
            const classCategory = isStandardType ? typeLower : 'general';
            
            card.id = update.id;
            card.className = `release-card card-${classCategory}`;
            if (selectedUpdateId === update.id) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta-left">
                        <div class="card-date">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5H7v2h5v-2zm4 0h-3v2h3v-2zm-4 4H7v2h5v-2zm4 0h-3v2h3v-2z"/>
                            </svg>
                            <span>${update.date}</span>
                        </div>
                        <span class="badge badge-${classCategory}">${update.type}</span>
                    </div>
                </div>
                <div class="card-content">
                    ${update.html}
                </div>
                <div class="card-actions">
                    <button class="card-btn card-btn-view" data-link="${update.link}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                        </svg>
                        Details
                    </button>
                    <button class="card-btn card-btn-copy">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        Copy
                    </button>
                    <button class="card-btn card-btn-tweet">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Draft Tweet
                    </button>
                </div>
            `;

            // Action: View GCP Release Page
            card.querySelector('.card-btn-view').addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(update.link, '_blank');
            });

            // Action: Copy Plain Text to Clipboard
            card.querySelector('.card-btn-copy').addEventListener('click', (e) => {
                e.stopPropagation();
                copyTextToClipboard(`BigQuery Update [${update.date}] - ${update.type}:\n${update.text}\n\nRead more: ${update.link}`);
            });

            // Action: Draft Tweet
            card.querySelector('.card-btn-tweet').addEventListener('click', (e) => {
                e.stopPropagation();
                selectUpdateForComposer(update);
            });

            // Double clicking card drafts tweet as well
            card.addEventListener('dblclick', () => {
                selectUpdateForComposer(update);
            });

            feedContainer.appendChild(card);
        });
    }

    // ----------------------------------------------------
    // 5. Tweet Composer Operations
    // ----------------------------------------------------
    function selectUpdateForComposer(update) {
        selectedUpdateId = update.id;
        
        // Update selected card UI class
        document.querySelectorAll('.release-card').forEach(c => {
            if (c.id === update.id) {
                c.classList.add('selected');
            } else {
                c.classList.remove('selected');
            }
        });

        // Set Preview panel
        previewDate.textContent = update.date;
        previewType.textContent = update.type;
        const typeLower = update.type.toLowerCase();
        previewType.className = `badge badge-${['feature', 'fixed', 'changed', 'deprecated'].includes(typeLower) ? typeLower : 'general'}`;
        previewTitle.textContent = update.headline;
        previewText.textContent = update.text;

        previewPlaceholder.classList.add('hidden');
        previewDetails.classList.remove('hidden');
        selectionPreview.classList.remove('empty');

        // Formulate smart draft tweet
        // X (Twitter) treats links as 23 characters using t.co
        // Formula: 280 (max) - 23 (link) - 24 (default tags: #BigQuery #GoogleCloud) - spacing/overhead = ~225 chars left.
        const defaultTags = '#BigQuery #GoogleCloud';
        const prefix = `BigQuery Update [${update.date}] | ${update.type}: `;
        
        // Compute maximum text length for update details
        // max_allowed_char = 280 - (prefix length) - (shortened link: 23) - (tags length + spacing: 25)
        const linkOverrideLength = 23;
        const overhead = prefix.length + linkOverrideLength + defaultTags.length + 4; // spaces + spacing
        const availableTextSpace = 280 - overhead;
        
        let updateTextSnippet = update.text;
        if (updateTextSnippet.length > availableTextSpace) {
            updateTextSnippet = updateTextSnippet.substring(0, availableTextSpace - 3).trim() + '...';
        }

        const draftText = `${prefix}${updateTextSnippet}\n\n${update.link}\n${defaultTags}`;
        tweetTextarea.value = draftText;
        
        // Trigger UI updates
        updateCharCount();
        showToast("Update selected and tweet drafted!", "success");

        // Focus and scroll to composer on small screens
        if (window.innerWidth <= 1024) {
            document.querySelector('.composer-panel').scrollIntoView({ behavior: 'smooth' });
        }
    }

    function clearComposer() {
        selectedUpdateId = null;
        document.querySelectorAll('.release-card').forEach(c => c.classList.remove('selected'));
        
        previewPlaceholder.classList.remove('hidden');
        previewDetails.classList.add('hidden');
        selectionPreview.classList.add('empty');

        tweetTextarea.value = '';
        updateCharCount();
    }

    function calculateTwitterLength(text) {
        if (!text) return 0;
        
        // Regex to identify HTTP/HTTPS links
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex) || [];
        
        // Calculate length excluding actual URLs
        let textWithoutUrls = text.replace(urlRegex, '');
        let length = textWithoutUrls.length;
        
        // Add 23 characters for each URL matched
        length += urls.length * 23;
        
        return length;
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const count = calculateTwitterLength(text);
        
        charCountSpan.textContent = count;
        
        // Circular progress ring calculation
        const circle = document.getElementById('char-progress-circle');
        if (circle) {
            const radius = circle.r.baseVal.value;
            const circumference = radius * 2 * Math.PI;
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            
            const percent = Math.min((count / 280) * 100, 100);
            const offset = circumference - (percent / 100 * circumference);
            circle.style.strokeDashoffset = offset;
            
            // Set circle color based on limits
            if (count > 280) {
                circle.style.stroke = 'var(--color-deprecated)';
            } else if (count > 250) {
                circle.style.stroke = 'var(--color-changed)';
            } else {
                circle.style.stroke = 'var(--color-primary)';
            }
        }
        
        // Adjust styling based on character thresholds
        if (count > 280) {
            charCounterWrapper.className = 'char-counter danger';
            tweetBtn.disabled = true;
            tweetBtn.classList.add('btn-disabled');
        } else if (count > 250) {
            charCounterWrapper.className = 'char-counter warning';
            tweetBtn.disabled = false;
            tweetBtn.classList.remove('btn-disabled');
        } else {
            charCounterWrapper.className = 'char-counter';
            tweetBtn.disabled = text.trim().length === 0;
            if (text.trim().length === 0) {
                tweetBtn.classList.add('btn-disabled');
            } else {
                tweetBtn.classList.remove('btn-disabled');
            }
        }
    }

    // ----------------------------------------------------
    // 6. Utility Functions & Event Listeners
    // ----------------------------------------------------
    function copyTextToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Copied to clipboard!", "success");
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showToast("Failed to copy text", "error");
        });
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Refresh button event listener
    refreshBtn.addEventListener('click', loadFeed);
    retryBtn.addEventListener('click', loadFeed);

    // Filter Chips Event listener
    typeFilters.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        
        activeTypeFilter = chip.getAttribute('data-type');
        updateActiveFilterUI();
        applyFiltersAndRender();
    });

    // Search Box keypress / input listener
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        applyFiltersAndRender();
    });

    // Sort order listener
    sortRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            applyFiltersAndRender();
        });
    });

    // Reset filters btn
    resetFiltersBtn.addEventListener('click', () => {
        activeTypeFilter = 'all';
        searchQuery = '';
        searchInput.value = '';
        updateActiveFilterUI();
        applyFiltersAndRender();
    });

    // Tweet Composer listeners
    tweetTextarea.addEventListener('input', updateCharCount);
    
    clearComposerBtn.addEventListener('click', clearComposer);

    // Append Hashtags listener
    tagChips.addEventListener('click', (e) => {
        const tagBtn = e.target.closest('.tag-chip-btn');
        if (!tagBtn) return;
        
        const tag = tagBtn.getAttribute('data-tag');
        let text = tweetTextarea.value;
        
        // Append tag if it's not already in the text
        if (!text.includes(tag)) {
            if (text.trim().length > 0) {
                // If there's content, append with spacing
                if (text.endsWith('\n') || text.endsWith(' ')) {
                    tweetTextarea.value = text + tag;
                } else {
                    tweetTextarea.value = text + ' ' + tag;
                }
            } else {
                tweetTextarea.value = tag;
            }
            updateCharCount();
            showToast(`Added ${tag}`, "success");
        } else {
            showToast(`${tag} is already in the draft!`, "warning");
        }
    });

    // Open Twitter intent on click
    tweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (!text) return;
        
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank');
        showToast("Opening X (Twitter)...", "success");
    });

    // CSV Export functionality
    function exportToCSV() {
        if (filteredUpdates.length === 0) {
            showToast("No updates available to export", "warning");
            return;
        }
        
        const headers = ["Date", "Type", "Headline", "Description", "Link"];
        const rows = filteredUpdates.map(update => [
            update.date,
            update.type,
            update.headline,
            update.text,
            update.link
        ]);
        
        const escapeCsvValue = (val) => {
            if (val === null || val === undefined) return '';
            let formatted = val.toString().trim();
            if (formatted.includes('"') || formatted.includes(',') || formatted.includes('\n') || formatted.includes('\r')) {
                formatted = `"${formatted.replace(/"/g, '""')}"`;
            }
            return formatted;
        };
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCsvValue).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_releases_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${filteredUpdates.length} updates to CSV!`, "success");
    }

    exportCsvBtn.addEventListener('click', exportToCSV);

    // Load theme & data on start
    initTheme();
    loadFeed();
});
