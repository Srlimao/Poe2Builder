// ============================================================
// gemTooltip.js — Gem hover tooltip rendering & positioning
// Depends on: state.js, database.js (getGemDataById)
// ============================================================

function showGemTooltip(gemId, targetElement) {
    const gem = getGemDataById(gemId);
    if (!gem) return;

    const tooltip = document.getElementById("gem-tooltip");
    if (!tooltip) return;

    document.getElementById("gem-tooltip-title").textContent = gem.Gem || gem.name;

    const tagsEl = document.getElementById("gem-tooltip-tags");
    if (gem.Tags && gem.Tags.length > 0) {
        tagsEl.textContent = gem.Tags.join(', ');
        tagsEl.classList.remove("hidden");
    } else {
        tagsEl.classList.add("hidden");
    }

    const statsEl = document.getElementById("gem-tooltip-stats");
    statsEl.innerHTML = "";

    if (gem.BaseCastTime) {
        const line = document.createElement("div");
        line.innerHTML = `Cast Time: <span style="color: white;">${gem.BaseCastTime / 1000} sec</span>`;
        line.style.marginBottom = "2px";
        line.style.color = "#aaa";
        statsEl.appendChild(line);
    }
    if (gem.Cost && gem.Cost.ManaPerMinute) {
        const line = document.createElement("div");
        line.innerHTML = `Cost: <span style="color: white;">${(gem.Cost.ManaPerMinute / 60).toFixed(2)} Mana per second</span>`;
        line.style.marginBottom = "2px";
        line.style.color = "#aaa";
        statsEl.appendChild(line);
    }

    if (gem.StatText && gem.StatText.length > 0) {
        gem.StatText.forEach(stat => {
            const line = document.createElement("div");
            let formattedStat = stat.replace(/\[([^|\\]+)\|([^\]]+)\]/g, '<span style="color: #6495ED;">$2</span>');
            formattedStat = formattedStat.replace(/\[([^\]]+)\]/g, '<span style="color: #6495ED;">$1</span>');
            formattedStat = formattedStat.replace(/\\n/g, '<br>');
            line.innerHTML = formattedStat;
            line.style.marginBottom = "2px";
            line.style.color = "#8888FF";
            statsEl.appendChild(line);
        });
    }

    if (statsEl.innerHTML !== "") {
        statsEl.classList.remove("hidden");
    } else {
        statsEl.classList.add("hidden");
    }

    const descEl = document.getElementById("gem-tooltip-desc");
    const descDivider = document.getElementById("gem-tooltip-desc-divider");
    if (gem.Description) {
        let formattedDesc = gem.Description.replace(/\[([^|\\]+)\|([^\]]+)\]/g, '<span style="color: #6495ED;">$2</span>');
        formattedDesc = formattedDesc.replace(/\[([^\]]+)\]/g, '<span style="color: #6495ED;">$1</span>');
        descEl.innerHTML = formattedDesc;
        descEl.classList.remove("hidden");
        if (statsEl.innerHTML !== "") descDivider.classList.remove("hidden");
        else descDivider.classList.add("hidden");
    } else {
        descEl.classList.add("hidden");
        descDivider.classList.add("hidden");
    }

    tooltip.classList.remove("hidden");

    // Positioning — center below target, with viewport bounds check
    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.bottom + 10;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
    if (top + tooltipRect.height > window.innerHeight - 10) top = rect.top - tooltipRect.height - 10;

    tooltip.style.top = top + "px";
    tooltip.style.left = left + "px";
}

function hideGemTooltip() {
    const tooltip = document.getElementById("gem-tooltip");
    if (tooltip) tooltip.classList.add("hidden");
}
