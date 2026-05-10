import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // or just +row.line
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

let data = await loadData();
let commits = processCommits(data);

let xScale;
let yScale;

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: 'https://github.com/xiaocheng05/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                writable: false,
                enumerable: false,
                configurable: false,
            });

            return ret;
        });
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats')
        .append('dl')
        .attr('class', 'stats');

    // Total LOC
    dl.append('dt')
        .html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd')
        .text(data.length);

    // Total commits
    dl.append('dt')
        .text('Total commits');
    dl.append('dd')
        .text(commits.length);

    // Number of files
    const numFiles = d3.group(data, d => d.file).size;

    dl.append('dt')
        .text('Number of files');
    dl.append('dd')
        .text(numFiles);

    // Longest file
    const files = d3.groups(data, d => d.file);

    const longestFile = d3.greatest(
        files,
        ([file, lines]) => lines.length
    );

    dl.append('dt')
        .text('Longest file');
    dl.append('dd')
        .text(`${longestFile[0]} (${longestFile[1].length} lines)`);

    // Average file length
    const avgFileLength =
        data.length / numFiles;

    dl.append('dt')
        .text('Average file length');
    dl.append('dd')
        .text(avgFileLength.toFixed(1));

    // Average line length
    const avgLineLength =
        d3.mean(data, d => d.length);

    dl.append('dt')
        .text('Average line length');
    dl.append('dd')
        .text(avgLineLength.toFixed(1));

    // Most common work day
    const workByDay = d3.rollups(
        commits,
        v => v.length,
        d => d.datetime.toLocaleDateString('en', {
            weekday: 'long'
        })
    );

    const busiestDay = d3.greatest(
        workByDay,
        d => d[1]
    );

    dl.append('dt')
        .text('Most active day');
    dl.append('dd')
        .text(busiestDay[0]);
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;

    const margin = {
        top: 10,
        right: 10,
        bottom: 30,
        left: 50,
    };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Scales
    xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

    yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

    // Gridlines
    svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
                .tickFormat('')
                .tickSize(-usableArea.width)
        );

    // Axes
    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat(d =>
            String(d % 24).padStart(2, '0') + ':00'
        );

    // X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt() // Change only this line
        .domain([minLines, maxLines])
        .range([5, 15]);

    // Sort commits by total lines in descending order
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    // Dots
    const dots = svg
        .append('g')
        .attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            updateTooltipVisibility(false);
        });

    createBrushSelector(svg);
    
}


function renderTooltipContent(commit) {
    if (!commit) return;

    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    link.href = commit.url;
    link.textContent = commit.id;

    date.textContent = commit.datetime?.toLocaleDateString('en', {
        dateStyle: 'full',
    });

    time.textContent = commit.datetime?.toLocaleTimeString('en', {
        hour: '2-digit',
        minute: '2-digit',
    });

    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d, xScale, yScale)
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function createBrushSelector(svg) {
    svg.call(d3.brush().on('start brush end', brushed));

    // Move dots above brush overlay so they receive events again
    svg.selectAll('.dots').raise();
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}


updateTooltipVisibility(false);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
//renderTooltipContent(commits);



//console.log(commits);
