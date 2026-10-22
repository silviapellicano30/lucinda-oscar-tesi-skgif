Lucinda_view.prototype.date_entry = function (...args) {

  let data = Lucinda_util.lucinda_unformat(args[0]).getData();
  if (data.length == 0) {
    return "";
  }
  const date = data[0];

  if (date.length == 0) {
    return "";
  }

  const parts = date[0].split("-");
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  // If day is 01 and month is 01, return only the year
  if (month === "01" && day === "01") {
    return `${year}`;
  }
  // If day is 01, exclude day and show only month and year
  if (day === "01") {
    return `${monthNames[parseInt(month)]} ${year}`;
  }
  // Otherwise return day, month, and year
  if (month && day) {
    return `${parseInt(day)} ${monthNames[parseInt(month)]} ${year}`;
  } else if (month) {
    return `${monthNames[parseInt(month)]} ${year}`;
  } else {
    return `${year}`;
  }
}

Lucinda_view.prototype.doc_entry = function (...args) {
  try {
    let html_obj = args[0];

    html_obj.querySelectorAll('div.itemlist-item').forEach(elem => {
      elem.className = "card shadow-sm p-4 m-2 mb-4";
    });

    // Select the <table> element within html_obj
    html_obj.querySelectorAll('div.itemlist-container').forEach(elem => {
      ROWHEIGHT = 250;
      elem.style.maxHeight = ROWHEIGHT*10+"px";
      elem.style.overflowY = 'auto';
    });

    html_obj.querySelectorAll('div.itemlist-att .itemlist-att-title').forEach(elem => {
      elem.innerHTML = "";
    });

    html_obj.querySelectorAll('div.itemlist-att[data-att$="author"]').forEach(elem => {
      let t_contet = elem.textContent;
      if (t_contet.trim() != "") {
        elem.innerHTML = _html_format_authors(t_contet);
      }
    });

    html_obj.querySelectorAll('div.itemlist-att[data-att$="pub_date"]').forEach(elem => {
      let t_contet = elem.textContent;
      if (t_contet.trim() != "") {
        let t_html = `${Lucinda.lv.date_entry(t_contet)}`;
        elem.innerHTML = t_html;
        //elem.style.display = 'inline-block';
        elem.className = "d-inline";
      }
    });

    html_obj.querySelectorAll('div.itemlist-att[data-att$="venue"]').forEach(elem => {
      let t_contet = elem.textContent;
      if (t_contet.trim() != "") {
        let v_name = t_contet.split(" [")[0];
        let t_html = `<i>${v_name}</i>`;
        elem.innerHTML = t_html;
        //elem.style.display = 'inline-block';
        elem.className = "d-inline";
      }
    });

    //style inside content
    let omid_url = "";
    let omid_val = "";
    html_obj.querySelectorAll('div.itemlist-att[data-att$="id"]').forEach(elem => {
      let all_ids = elem.textContent;

      const services = {
        doi: {
          url: id => `https://doi.org/${id}`,
          color: "btn-success" // red
        },
        openalex: {
          url: id => `https://openalex.org/${id}`,
          color: "btn-info" // green
        },
        pmid: {
          url: id => `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          color: "btn-warning" // blue
        },
        omid: {
          url: id => `https://opencitations.net/meta/${id}`,
          color: "btn-warning" // yellow
        }
      };

      const l_htmlButtons = all_ids.split(" ").flatMap(item => {
        const [type, value] = item.split(":");
        if (services[type]) {
          if (type === "omid") {
            omid_val = value;
            omid_url = services[type]["url"](value);
            return []; // omit from output
          } else {
            const { url, color } = services[type];
            return [`<a href="${url(value)}" target="_blank" class="anyid-${type} ${color}"><strong>${type}</strong>:${value}</a>`];
          }
        }
        return []; // omit unknown types too
      });
      htmlButtons = "";
      if (l_htmlButtons.length > 0) {
        htmlButtons = l_htmlButtons.join("  •  ");
      }
      elem.innerHTML = `<br><p>`+htmlButtons+"<p>";
    });

    html_obj.querySelectorAll('div.itemlist-att[data-att$="title"]').forEach(elem => {
      let t_content = elem.textContent;
      if ((t_content.trim() == "") || (t_content == undefined)) {
        t_content = "[No Title]";
      }
      let t_html = `<br><h5><a href="${omid_url}" target="_blank">${t_content}</a></h5>`;
      elem.innerHTML = t_html;
    });

    return html_obj;
  } catch (e) {
    console.log(e);
    return "";
  }

  function _html_format_authors(inputStr) {
    const authors = inputStr.split(';').map(author => author.trim()).filter(Boolean);
    const formatted = authors.map(author => {
      // Extract name (before first "[") and bracket content
      const nameMatch = author.match(/^([^\[]+)\s*\[/);
      const name = nameMatch ? nameMatch[1].trim() : author;

      // Extract ORCID and OMID using regex
      const orcidMatch = author.match(/orcid:([\d-]+)/);
      const omidMatch = author.match(/omid:ra\/([\w\d]+)/);

      const orcid = orcidMatch ? orcidMatch[1] : null;
      const omid = omidMatch ? omidMatch[1] : null;

      // Build HTML string
      let html = '';
      if (omid) {
        html += `<a href="https://opencitations.net/meta/ra/${omid}">${name}</a>`;
      } else {
        html += name;
      }

      if (orcid) {
        html += ` (<a href="https://orcid.org/${orcid}">${orcid}</a>)`;
      }

      return html;
    });

    return formatted.join("  •  ");
  }
}

Lucinda_view.prototype.author_entry= function (...args){
  try {
    let html_obj = args[0];

    html_obj.querySelectorAll('div.itemlist-att .itemlist-att-title').forEach(elem => {
      elem.innerHTML = "";
    });

    let a_fnames = [];
    html_obj.querySelectorAll('div.itemlist-att[data-att$="author"]').forEach(elem => {
      a_fnames = elem.textContent.split(";").map(s => s.trim());
      elem.innerHTML = "";
    });

    let a_orcids = [];
    html_obj.querySelectorAll('div.itemlist-att[data-att$="author_orcid"]').forEach(elem => {
      a_orcids = elem.textContent.split(";").map(s => s.trim());
      elem.innerHTML = "";
    });

    let a_omids = [];
    html_obj.querySelectorAll('div.itemlist-att[data-att$="author_omid"]').forEach(elem => {
      a_omids = elem.textContent.split(";").map(s => s.trim());
      elem.innerHTML = "";
    });

    const matrix = a_fnames.map((name, i) => [name, a_orcids[i], a_omids[i]]);

    const htmlSnippets = matrix.map(([name, orcid, omid]) => {
      const orcidDigits = orcid.match(/\d{4}-\d{4}-\d{4}-\d{4}/)?.[0] || '';
      return `<a href="${omid}">${name}</a> (<a href="${orcid}">${orcidDigits}</a>)`;
    });

    html_obj.querySelectorAll('div.itemlist-att[data-att$="author"]').forEach(elem => {
      elem.innerHTML = htmlSnippets.join(" • ");
    });

    return html_obj;

  } catch (e) {
    return "<span class='lucinda-view-err'>Error!</span>";
  }
};

Lucinda_view.prototype.venue_entry= function (...args){
  try {

    let data = Lucinda_util.lucinda_unformat(args[0]).getData();

    let res = [];
    for (let j = 0; j < data.length; j++) {
      let venue_row = data[j];
      let venue = venue_row[0];
      if (venue == "") {
        res.push("");
        continue;
      }

      // Parse "Venue Name [id1 id2]"
      let venue_parts = venue.split("[");
      let venue_name = venue_parts[0].trim();
      let match = venue.match(/\[(.*?)\]/);
      let l_venue_ids = [];
      if (match) {
        l_venue_ids = match[1].split(' ').map(part => part.trim()).filter(Boolean);
      }

      // get all ids
      let venue_omid = "";
      let any_venue_id = [];
      
      for (let i = 0; i < l_venue_ids.length; i++) {
        const token = l_venue_ids[i];
        const venue_id_parts = token.split(":");
        
        if (venue_id_parts.length < 2) {
             any_venue_id.push(token);
             continue;
        }

        const scheme = venue_id_parts[0].toLowerCase();
        const value = venue_id_parts.slice(1).join(":");

        // Capture OMID for the main title link
        if (scheme == "omid"){
          venue_omid = "https://w3id.org/oc/meta/" + value;
        } 
        else {
          // Create links for other identifiers
          let url = "#";
          if (scheme === 'doi') url = `https://doi.org/${value}`;
          else if (scheme === 'issn') url = `https://portal.issn.org/resource/ISSN/${value}`;
          else if (scheme === 'pmid') url = `https://pubmed.ncbi.nlm.nih.gov/${value}/`;
          else if (scheme === 'openalex') url = `https://openalex.org/${value}`;
          
          if (url !== "#") {
            any_venue_id.push(`<a href="${url}" target="_blank" class="text-dark text-decoration-none">${token}</a>`);
          } else {
            any_venue_id.push(token);
          }
        }
      }
      
      // Construct HTML
      // 1. Title Link
      let titleHtml = venue_name;
      if (venue_omid) {
          titleHtml = `<a href='${venue_omid}' target='_blank'>${venue_name}</a>`;
      } else {
          titleHtml = `<i>${venue_name}</i>`;
      }

      // 2. Identifiers string
      let idsHtml = "";
      if (any_venue_id.length > 0) {
          idsHtml = " (" + any_venue_id.join("  •  ") + ")";
      }

      res.push(titleHtml + idsHtml);
    }

    return res.join("</br>");

  } catch (e) {
    console.error(e);
    return "<span class='lucinda-view-err'>Error!</span>";
  }
}

Lucinda_view.prototype.id_entry= function (...args){

  let data = Lucinda_util.lucinda_unformat(args[0]).getData();

  let res = [];
  if (data.length > 0) {
    let source = data[0];
    let source_val = source[0].split(" ");
    let source_links = source[1].split(" ");

    for (let i = 0; i < source_val.length; i++) {
      const s_val = source_val[i];
      let s_link = "";
      if (source_links.length > i-1) {
        s_link = source_links[i];
      }
      res.push(`<a href='${s_link}'>${s_val}</a>` );
    }
    // let matrix = [
    //   [0, 1], // header
    //   ...source_val.map((val, i) => [val, source_links[i] ?? null])
    //   ];
  }
  return res.join(" • ");
}


Lucinda_view.prototype.year = function(...args){
  let current_val = args[0];
  return current_val.split("-")[0] ;
}


Lucinda_view.prototype.barchart = function(...args){
      const dom_id = args[0];
      const ctx = document.getElementById(dom_id);
      const l_data = Lucinda_util.lucinda_unformat(args[1]).getData();

      const axes = {};

      if (l_data.length == 0) {
        ctx.style.display = "none";
        return "";
      }

      for (let i = 0; i < l_data.length; i++) {
        let x_val = l_data[i][0];
        let y_val = 0;
        if (!(x_val in axes)) {
          axes[x_val] = y_val;
        }
        axes[x_val] += 1;
      }

      const sorted_keys = Object.keys(axes).sort(); // Sorts keys as strings (which works for years)
      const sorted_vals = sorted_keys.map(key => axes[key]);

      // import in the html <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted_keys,
          datasets: [{
            label: '# Citations',
            backgroundColor: '#4985f3',
            data: sorted_vals,
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,  // <-- important
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                // Show only integer ticks on y-axis
                stepSize: 1,
                callback: function(value) {
                  return Number.isInteger(value) ? value : '';
                }
              }
            }
          }
        }
      });
      return "";
}
//PIETRO

// Author Profile Link
Lucinda_view.prototype.create_author_header_link = function (...args) {
    try {
        let id_data = Lucinda_util.lucinda_unformat(args[0]).getData();
        let gname_data = Lucinda_util.lucinda_unformat(args[1]).getData();
        let fname_data = Lucinda_util.lucinda_unformat(args[2]).getData();
        let fullname_data = Lucinda_util.lucinda_unformat(args[3]).getData();

        console.log("id_data", id_data);
        console.log("gname_data", gname_data);
        console.log("fname_data", fname_data);
        console.log("fullname_data", fullname_data);

        let id = (id_data[0] && id_data[0][0]) ? id_data[0][0] : "";
        let gname = (gname_data[0] && gname_data[0][0] && gname_data[0][0] !== null) ? gname_data[0][0] : "";
        let fname = (fname_data[0] && fname_data[0][0] && fname_data[0][0] !== null) ? fname_data[0][0] : "";
        let fullname_direct = (fullname_data[0] && fullname_data[0][0] && fullname_data[0][0] !== null) ? fullname_data[0][0] : "";

        console.log("id", id);
        console.log("gname", gname);
        console.log("fname", fname);
        console.log("fullname_direct", fullname_direct);

        let fullname = (gname + " " + fname).trim() || fullname_direct || "Unknown Author";
        console.log("fullname result", fullname);

        return `<a href="https://ldd.opencitations.net/meta/ra/${id}" target="_blank" class="text-reset text-decoration-none">${fullname}</a>`;
    } catch (e) {
        console.log("error", e);
        return "Link Error";
    }
};

// Document Profile Link
Lucinda_view.prototype.create_br_header_link = function (...args) {
    try {
        let id_data = Lucinda_util.lucinda_unformat(args[0]).getData();
        let title_data = Lucinda_util.lucinda_unformat(args[1]).getData();

        let title = (title_data[0] && title_data[0][0]) ? title_data[0][0] : null;

        // Handle "No Title" case 
        if (!title) {
            return `<span style="color:orange">This resource has no title</span>`;
        }

        // Clean the ID (remove "omid:")
        let raw_id = (id_data[0] && id_data[0][0]) ? id_data[0][0] : "";
        let clean_id = raw_id;
        
        let parts = raw_id.split(/\s+/);
        let found = parts.find(p => p.startsWith("omid:"));
        if (found) {
            clean_id = found.substring(5); // Removes "omid:", returns "br/..."
        }

        return `<a href="https://ldd.opencitations.net/meta/${clean_id}" target="_blank" class="text-reset text-decoration-none">${title}</a>`;
    } catch (e) {
         return `<span style="color:orange">Error creating link</span>`;
    }
};

Lucinda_view.prototype.create_br_header_link = function (...args) {
    try {
        let id_data = Lucinda_util.lucinda_unformat(args[0]).getData();
        let title_data = Lucinda_util.lucinda_unformat(args[1]).getData();

        let title = (title_data[0] && title_data[0][0]) ? title_data[0][0] : null;

        // Handle "No Title" case 
        if (!title) {
            return `<span style="color:orange">This resource has no title</span>`;
        }

        // Clean the ID 
        let raw_id = (id_data[0] && id_data[0][0]) ? id_data[0][0] : "";
        let clean_id = raw_id;
        
        let parts = raw_id.split(/\s+/);
        let found = parts.find(p => p.startsWith("omid:"));
        if (found) {
            clean_id = found.substring(5); // Removes "omid:", returns "br/..."
        }

        return `<a href="https://ldd.opencitations.net/meta/${clean_id}" target="_blank" class="text-reset text-decoration-none">${title}</a>`;
    } catch (e) {
         return `<span style="color:orange">Error creating link</span>`;
    }
};

Lucinda_view.prototype.create_link = function (...args) {

    let id = Lucinda_util.lucinda_unformat(args[0]).getData()[0][0];

    let title = Lucinda_util.lucinda_unformat(args[1]).getData()[0][0];

    return `<a href="https://w3id.org/oc/meta/br/${id}">${title}</a>`;
};

Lucinda_view.prototype.remove_percent = function (...args) {
    
    let data = Lucinda_util.lucinda_unformat(args[0]).getData();
    
    if (!data || data.length === 0) return "";
    
    let str = data[0][0]; 
    if (!str) return "";

    try { 
      return decodeURIComponent(str);
    } catch (e) {
        
        return str.replace(/%20/g, " ");
    }
};

Lucinda_view.prototype.pipe_count = function (...args) {
    
    let data = Lucinda_util.lucinda_unformat(args[0]).getData();
    
    if (!data || data.length === 0) {
       
        return 0;
    }
    const str = data[0][0]; 

    if (!str || typeof str !== "string") {
       
        return 0;
    }
    
    const final = str 
        .split("|")
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .length;
    
    return final;
};

Lucinda_view.prototype.display_omid = function (data) {
    if (!data) return "";

    function cleanID(str) {
        if (!str) return null;
       
        var parts = str.toString().split(/\s+/);
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].indexOf("omid:") === 0) {
                // Return everything after 'omid:'
                return parts[i].substring(5);
            }
        }
        return null;
    }

    if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
            var result = cleanID(data[i]);
            if (result) return result;
        }
    }
    
    else {
        return cleanID(data) || "";
    }

    return "";
};

Lucinda_view.prototype.barchart_simple = function (dom_id, raw_dates) {
  

  if (dom_id && typeof dom_id === 'object' && dom_id.getData) {
      dom_id = Lucinda_util.lucinda_unformat(dom_id).getData();
  }
  if (Array.isArray(dom_id)) {
      dom_id = dom_id[0];
  }

  // --- to show No Citations message ---
  function showNoData() {
      
      const canvas = document.getElementById(dom_id);
      
      // Retry if DOM not ready
      if (!canvas) {
          setTimeout(showNoData, 50);
          return;
      }

      // Only replace if it hasn't been replaced already
      if (canvas.tagName === 'CANVAS') {
          const msg = document.createElement('div');
          msg.className = 'text-center text-muted small p-4'; 
          msg.innerHTML = '<em>No citations found.</em>';
          canvas.replaceWith(msg);
      }
  }

  let dateList = raw_dates[1];

  // ---normalize input ---
  // pipe string 
  if (typeof dateList === 'string') {
      dateList = dateList.includes('|') ? dateList.split('|') : [dateList];
  }
  // array with ONE item that is a pipe string 
  else if (Array.isArray(dateList)) {
      
      if (dateList.length === 1 && typeof dateList[0] === 'string' && dateList[0].includes('|')) {
          dateList = dateList[0].split('|');
          console.log("dateList (split from pipe):", dateList);
      }
      // nested array 
      else if (dateList.length === 1 && Array.isArray(dateList[0])) {
          dateList = dateList[0];
          console.log("dateList (unwrapped):", dateList); 
      }
  }
  
    const axes = {};
    let hasData = false; // Flag 

    if (Array.isArray(dateList)) {
        dateList.forEach(y => {
            if (!y || y === 'n.d.') return;
            // Trim whitespace just in case (e.g. "2018 | 2019")
            let cleanY = (typeof y === 'string') ? y.trim() : y;
            if (cleanY) {
                axes[cleanY] = (axes[cleanY] || 0) + 1;
                hasData = true;
            }
        });
    }

    // If no data found
    if (!hasData) {
        showNoData();
        return "";
    }

    const sorted_keys = Object.keys(axes).sort();
    const sorted_vals = sorted_keys.map(key => axes[key]);

    const drawChart = () => {
        const canvas = document.getElementById(dom_id);
        if (!canvas) {
            setTimeout(drawChart, 50);
            return;
        }
        
        // Destroy existing chart 
        if (Chart.getChart(canvas)) {
            Chart.getChart(canvas).destroy();
        }

        const ctx = canvas.getContext('2d');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted_keys,
                datasets: [{
                    label: '# Publications',
                    data: sorted_vals,
                    backgroundColor: '#4985f3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            callback: v => Number.isInteger(v) ? v : ''
                        }
                    }
                }
            }
        });
    };

    drawChart();
    return "";
};

Lucinda_view.prototype.barchart_from_ids = function (dom_id, ids_data) {

    if (ids_data && typeof ids_data === 'object' && ids_data.getData) {
        ids_data = Lucinda_util.lucinda_unformat(ids_data).getData();
    }
    if (Array.isArray(ids_data) && ids_data.length === 1) {
        ids_data = ids_data[1];
    }
    if (Array.isArray(ids_data) && ids_data.length > 1 && Array.isArray(ids_data[1])) {
       ids_data = ids_data[1][0]; 
    }

    function showNoData() {
        console.log(`[barchart_from_ids] Showing 'No Data' message for ${dom_id}`);
        const canvas = document.getElementById(dom_id);
        
        if (!canvas) {
            setTimeout(showNoData, 50);
            return;
        }

        if (canvas.tagName === 'CANVAS') {
            const msg = document.createElement('div');
            msg.className = 'text-center text-muted small p-4'; 
            msg.innerHTML = '<em>No citations found.</em>';
            canvas.replaceWith(msg);
        }
    }

    // check empty data
    if (!ids_data || typeof ids_data !== 'string' || ids_data.trim() === "") {
        console.warn(`[barchart_from_ids] Data is empty or invalid string.`);
        showNoData(); 
        return ""; 
    }

    // split ids
    let ids = ids_data.split("|").filter(s => s.trim() !== "");
    console.log(`[barchart_from_ids] Parsed ID count: ${ids.length}`);
    
    if (ids.length === 0) {
        console.warn(`[barchart_from_ids] ID list is empty after split.`);
        showNoData();
        return "";
    }

    // batch api calls
    const BATCH_SIZE = 10; 
    const promises = [];

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        
        const metaIds = batch.map(id => {
            return id.includes('/') ? `omid:${id}` : `omid:br/${id}`;
        }).join('__');

        const apiUrl = `https://api.opencitations.net/meta/v1/metadata/${metaIds}`;
        
        console.log(`[barchart_from_ids] Fetching Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${apiUrl}`);
        
        promises.push(
            fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return response.json();
            })
            .catch(err => {
                console.error(`[barchart_from_ids] Batch failed:`, err);
                return []; // Return empty array on error to keep other batches alive
            })
        );
    }

    Promise.all(promises)
        .then(results => {
            // Flatten the array of arrays into one single list
            const allData = results.flat();
            
            const years = [];
            allData.forEach(item => {
                if (item && item.pub_date) {
                    const y = item.pub_date.split("-")[0];
                    if (y && !isNaN(y)) years.push(y);
                }
            });

            if (years.length > 0) {
                const formattedData = [['year'], [years]];
                Lucinda.lv.barchart_simple(dom_id, formattedData);
            } else {
                showNoData();
            }
        })
        .catch(err => {
            
            showNoData(); 
        });

    return "";
};


Lucinda_view.prototype.getRaw = function (...args) {
  try {
    // unwrap data from span object
    let data = Lucinda_util.lucinda_unformat(args[0]).getData();

    //return raw value 
    if (data && data.length > 0 && data[0].length > 0) {
      return data[0][0];
    }
    return "";
  } catch (e) {
    console.error("Error in getRaw:", e);
    return "";
  }
};

/*
---------------------
PREPROCESS FUNCTIONS|
---------------------
*/
function pre_search_authors(search_query) {
  if (typeof search_query !== 'string') return { search_query: '""', search_query_gname: '""', search_query_fname: '""', is_single_term: 'false' };

  let clean;
  try {
    clean = decodeURIComponent(search_query).trim();
  } catch (e) {
    clean = search_query.replace(/%20/g, ' ').trim();
  }

  if (!clean) return { search_query: '""', search_query_gname: '""', search_query_fname: '""', is_single_term: 'false' };

  const terms = clean.split(/\s+/).filter(t => t.length > 0);
  const isSingle = terms.length === 1;

  const andExpr = terms.map(t => `"${t}"`).join(' AND ');
  const orExpr = terms.map(t => `"${t}"`).join(' OR ');

  return {
    search_query: `'${andExpr}'`,
    search_query_gname: `'${orExpr}'`,
    search_query_fname: `'${orExpr}'`,
    is_single_term: isSingle ? 'true' : 'false'
  };
}
function remove_per(search_query) {
    console.log("before pre process", search_query)
  if (typeof search_query !== 'string') return { search_query: '""' };
  
  let clean;
  try {
    clean = decodeURIComponent(search_query).trim();
  } catch (e) {
    clean = search_query.replace(/%20/g, ' ').trim();
  }
  
  if (!clean) return { search_query: '""' };

  const terms = clean.split(/\s+/).filter(t => t.length > 0);

  if (terms.length === 1) {
    return { search_query: `'"${terms[0]}"'` };
  }

  const andExpr = terms.map(t => `"${t}"`).join(' AND ');
  return { search_query: `'${andExpr}'` };
}

function strip(...args) {
  if (args.length === 0) return [];
  return args
    .filter(arg => typeof arg === 'string')
    .map(str => str.trim());
}

function pre_oci(oci) {
    const parts = oci.split('-');
    
    if (parts.length !== 2) {
        return { oci: oci }; 
    }

    return {
        citing_br: parts[0],
        cited_br: parts[1]
    };
}

function pre_search(query) {
  console.log(query)
}


/*
----------------------
POSTPROCESS FUNCTIONS|
----------------------
*/

// ---new_br_any_browser---
function post_ocmeta_call(...args) {

  let alldata = args[0];

  let new_data = [];

  let header = alldata[0];
  new_data.push(header);

  if (alldata.length <= 1) {
    new_data.push([]);
    return new_data;
  }

  let data = alldata.slice(1);

  for (let i = 0; i < data.length; i++) {
    let entity = data[i];

    const title = entity[0];
    const author = entity[1];
    const id = entity[4];
    const pub_date = entity[6];

    const f_pub_date = Lucinda_util.lucinda_format(pub_date);
    let processedDate = Lucinda.lv.date_entry(f_pub_date);

    let processedTitle = title;
    if (title != null) {
      processedTitle = `${title}`;
    }

    let processedAuthor = author;
    let processedAuthor_orcid = [];
    let processedAuthor_omid = [];

    if (author != null) {
      processedAuthor = _process_ordered_list(author);

      for (let i = 0; i < processedAuthor.length; i++) {
        let auth_parts = processedAuthor[i].split("[");
        processedAuthor[i] = auth_parts[0].trim();

        if (auth_parts.length > 1) {
          let a_ids = auth_parts[1].replace("]", "").split(" ");

          let fmatch = a_ids.find(item => item.startsWith("orcid:"));
          if (fmatch) {
            processedAuthor_orcid.push("https://orcid.org/" + fmatch.substring(6));
          } else {
            processedAuthor_orcid.push("");
          }

          fmatch = a_ids.find(item => item.startsWith("omid:"));
          if (fmatch) {
            processedAuthor_omid.push("http://127.0.0.1:5500/example/oc/html_template/browser.html?value=" + fmatch.substring(5));
          } else {
            processedAuthor_omid.push("");
          }

        }
      }
    }

    let processedId = id;
    let processedId_link = id;
    if (author != null) {
      processedId = id.split(" ");
      processedId_link = _add_anyidlink(processedId);
    }
    new_data.push([
      processedTitle,
      processedAuthor.join("; "),
      processedAuthor_orcid.join("; "),
      processedAuthor_omid.join("; "),
      processedId.join(" "),
      processedId_link.join(" "),
      processedDate
    ]);
  }

  return new_data;

  function _process_ordered_list(items) {
    if (!items) return items;

    const itemsDict = {};
    const roleToName = {};

    items.split('|').forEach(item => {
      const parts = item.split(':');
      const name = parts.slice(0, -2).join(':');
      const currentRole = parts[parts.length - 2];
      const nextRole = parts[parts.length - 1] || null;

      itemsDict[currentRole] = nextRole;
      roleToName[currentRole] = name;
    });

    // Find the starting role 
    const allRoles = Object.keys(itemsDict);
    const nextRoles = new Set(Object.values(itemsDict));
    const startRole = allRoles.find(role => !nextRoles.has(role));

    // Rebuild the ordered list
    const orderedItems = [];
    let currentRole = startRole;

    while (currentRole) {
      orderedItems.push(roleToName[currentRole]);
      currentRole = itemsDict[currentRole];
    }
    return orderedItems;
    
  }

  function _add_anyidlink(items) {
    const anyids_map = {
        "omid": "https://w3id.org/oc/meta/",
        "doi": "https://www.doi.org/",
        "pmid": "https://pubmed.ncbi.nlm.nih.gov/",
        "openalex": "https://openalex.org/works/"
    };

    // Normalize input
    let idList = [];
    if (!items) return [];
    if (Array.isArray(items)) {
        idList = items.map(id => id.trim()).filter(Boolean);
    } else if (typeof items === "string") {
        idList = items.split("|").map(id => id.trim()).filter(Boolean);
    } else {
        
        return [];
    }

    
    const text = [];

    for (let i = 0; i < idList.length; i++) {
        const item = idList[i];
        for (const _id in anyids_map) {
            if (item.startsWith(_id + ":")) {
                text.push(anyids_map[_id] + item.split(_id + ":")[1]);
            }
        }
    }

    return text;
  }
}


// ---new_ci_browser---
function post_ocmeta_call_2(...args) {
    
    let alldata = args[0];
    
    if (!alldata) {
        console.error("alldata is null or undefined");
        return [['error'], ['No data received']];
    }
    
    if (!Array.isArray(alldata)) {
        console.error("alldata is not an array:", alldata);
        return [['error'], ['Data is not an array']];
    }
    
    if (alldata.length <= 1) {
        
        const fullHeader = [
            'citingTitle', 'citingAuthorNames', 'citingPubDateRaw', 'citingBRID', 'citingBRURI', 'citindIdsList',
            'citedTitle', 'citedAuthorNames', 'citedPubDateRaw', 'citedBRID', 'citedBRURI', 'CitedIdsList'
        ];
        return [alldata.length > 0 ? alldata[0] : fullHeader, []]; 
    }
    
    let citing_result = {};
    let cited_result = {};
    let data = alldata.slice(1);

    // title link
    function _create_local_br_link(br_id, title) {
      if (!br_id || !title) return title || "";
      const url = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=br/${br_id}`;
      return `<a href="${url}" target="_blank">${title}</a>`;
    }
    
    
    function _process_authors_with_links(items) {
        if (!items) return ""; 

        const authors = items.split('|').map(a => a.trim()).filter(Boolean);
        
        const formatted = authors.map(authorStr => {
            
            const nameMatch = authorStr.match(/^([^\[]+)\s*\[/);
            const name = nameMatch ? nameMatch[1].trim() : authorStr;

            const orcidMatch = authorStr.match(/orcid:([\d-X]+)/i);
            const raUriMatch = authorStr.match(/\/ra\/([\w\d]+)/); // Extracts OMID from .../ra/060...

            const orcid = orcidMatch ? orcidMatch[1] : null;
            const omidDigit = raUriMatch ? raUriMatch[1] : null;

            let html = '';

            if (omidDigit) {
                html += `<a href="http://127.0.0.1:5500/example/oc/html_template/browser.html?value=ra/${omidDigit}" target="_blank">${name}</a>`;
            } else {
                html += name;
            }

            if (orcid) {
                html += ` (<a href="https://orcid.org/${orcid}" target="_blank">${orcid}</a>)`;
            }

            return html;
        });

        return formatted.join("  •   ");
    }

    // format ids
    function _add_anyidlink(items) {
      const anyids_map = {
          "omid": "https://w3id.org/oc/meta/",
          "doi": "https://www.doi.org/",
          "pmid": "https://pubmed.ncbi.nlm.nih.gov/",
          "openalex": "https://openalex.org/works/"
      };

      let idList = [];
      if (Array.isArray(items)) {
          idList = items.map(id => id.trim()).filter(Boolean);
      } else if (typeof items === "string") {
          idList = items.split("|").map(id => id.trim()).filter(Boolean);
      } else {
          return "";
      }

      const links = [];
      for (let i = 0; i < idList.length; i++) {
          const item = idList[i];
          const lower = item.toLowerCase();
          for (const _id in anyids_map) {
              if (lower.startsWith(_id + ":")) {
                  const value = item.split(":")[1];
                  const url = anyids_map[_id] + value;
                  links.push(`<a href="${url}" target="_blank">${item}</a>`);
                  break;
              }
          }
      }
      return links.join("  •   ");
    }

    for (let i = 0; i < data.length; i++) {
        let entity = data[i];
        
        const role = entity && entity[0] ? entity[0] : ""; 
        const br_id = entity && entity[1] ? entity[1] : "";
        const title = entity && entity[2] ? entity[2] : "";
        const pub_date = entity && entity[3] ? entity[3] : "";
        const author = entity && entity[4] ? entity[4] : "";
        const ids_list = entity && entity[5] ? entity[5] : "";


        const processedTitle = _create_local_br_link(br_id, title);
        
        const processedAuthorNames = _process_authors_with_links(author);
        
        const processedBRID = br_id;
        const processedBRURI = br_id ? `https://w3id.org/oc/meta/br/${br_id}` : "";
        const processedIdsList = _add_anyidlink(ids_list);

        if (role === 'citing') {
            citing_result = {
                citingTitle: processedTitle,
                citingAuthorNames: processedAuthorNames,
                citingPubDateRaw: pub_date,
                citingBRID: processedBRID,
                citingBRURI: processedBRURI,
                citingIdsList: processedIdsList
                
            };
        } else if (role === 'cited') {
            cited_result = {
                citedTitle: processedTitle,
                citedAuthorNames: processedAuthorNames,
                citedPubDateRaw: pub_date,
                citedBRID: processedBRID,
                citedBRURI: processedBRURI,
                citedIdsList: processedIdsList
            };
        }
    }


    if (citing_result.citingBRID) {
        citing_result.citingBRID = _create_br_link_string(citing_result.citingBRID);
    }
    if (citing_result.citingBRURI) {
        citing_result.citingBRURI = `<a href="${citing_result.citingBRURI}" target="_blank">${citing_result.citingBRURI}</a>`;
    }

    if (cited_result.citedBRID) {
        cited_result.citedBRID = _create_br_link_string(cited_result.citedBRID);
    }
    if (cited_result.citedBRURI) {
        cited_result.citedBRURI = `<a href="${cited_result.citedBRURI}" target="_blank">${cited_result.citedBRURI}</a>`;
    }
    
    const headerRow = [
        'citingTitle', 'citingAuthorNames', 'citingPubDateRaw', 'citingBRID', 'citingBRURI', 'citingIdsList',
        'citedTitle', 'citedAuthorNames', 'citedPubDateRaw', 'citedBRID', 'citedBRURI', 'citedIdsList'
    ];
    
    const dataRow = [
        citing_result.citingTitle || "",
        citing_result.citingAuthorNames || "",
        citing_result.citingPubDateRaw || "",
        citing_result.citingBRID || "", 
        citing_result.citingBRURI || "", 
        citing_result.citingIdsList || "",
        cited_result.citedTitle || "",
        cited_result.citedAuthorNames || "",
        cited_result.citedPubDateRaw || "",
        cited_result.citedBRID || "", 
        cited_result.citedBRURI || "",  
        cited_result.citedIdsList || ""
    ];

    const result = [headerRow, dataRow];
    
    return result;
}



// ---new_ci_browser---
function post_ocindex_call_2(...args) {

    let alldata = args[0];

    const get_intersection_count = (list1_string, list2_string) => {
        if (!list1_string || !list2_string) return 0;
        const list1 = new Set(list1_string.split('|').filter(id => id.trim() !== ''));
        const list2 = list2_string.split('|').filter(id => id.trim() !== '');

        let count = 0;
        for (const item of list2) {
            if (list1.has(item)) {
                count++;
            }
        }
        return count;
    };

    const get_url_param_value = (paramName) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(paramName) || 'ID Not Found in URL';
    };

    const results = {};
    const finalData = [];
    
    // define headers
    finalData.push([
        'CitingReferences', 'CitingCitations', 'CitedReferences', 
        'CitedCitations', 'CitedbyBoth', 'CitingBoth', 'OciID' 
    ]);

    console.log('ALLDATA:', alldata);
    

    // no data cases
    if (!alldata || alldata.length <= 1) {
        finalData.push(["", "", "", "", "0", "0", get_url_param_value('value')]); 
        return finalData;
    }
    
    const data = alldata.slice(1);
    

    for (let i = 0; i < data.length; i++) {
        let row = data[i];

        if (Array.isArray(row) && row.length === 1 && Array.isArray(row[0])) {
            row = row[0];
            
        }
        
        const source_role_clean = (row[0] || "").trim().toLowerCase();
       
        
        const references_list_raw = row[1] || "";
        const citations_list_raw = row[2] || "";

        if (source_role_clean === 'citing') {
            
            results.CitingReferences = references_list_raw;
            results.CitingCitations = citations_list_raw;
        } else if (source_role_clean === 'cited') {
            
            results.CitedReferences = references_list_raw;
            results.CitedCitations = citations_list_raw;
        } else {
            
        }
    }

    const citedByBothCount = get_intersection_count(
        results.CitingReferences,
        results.CitedReferences
    );
    const citingBothCount = get_intersection_count(
        results.CitingCitations,
        results.CitedCitations
    );
    
    const ociId = get_url_param_value('value');

    // final output
    const finalRow = [
        results.CitingReferences || "",
        results.CitingCitations || "",
        results.CitedReferences || "",
        results.CitedCitations || "",
        String(citedByBothCount),
        String(citingBothCount),
        ociId
    ];
    
    finalData.push(finalRow);
    
    return finalData;
}

// ---new_ra_browser---
function post_author_meta( ...args ) {
    
    const alldata = (args[0]?.results?.bindings)            
                  ? __normalise_bindings(args[0])
                  : args[0];                               // already a matrix

    if (!Array.isArray(alldata) || alldata.length === 0) {
        return [["ORCID","Given","Family","Display name","Other IDs"],
                ["—","—","—","—","—"]];
    }

    const row   = alldata[0] || [];
    const orcid = (row[0] || "").trim();
    const gname = (row[1] || "").trim();
    const fname = (row[2] || "").trim();
    const full  = (row[3] || "").trim();
    const other = (row[4] || "").trim();

    const orcidHtml = orcid
        ? `<a href="https://orcid.org/${orcid}" target="_blank">${orcid}</a>`
        : "—";

    return [
        ["ORCID","Given","Family","Display name","Other IDs"],
        [orcidHtml, gname, fname, full, other]
    ];


    function __normalise_bindings(json) {
        try {
            return json.results.bindings.map(b =>
                ["orcid","gname","fname","fullname","otherIDs"]
                    .map(k => b[k]?.value || "")
            );
        } catch (_) {
            return [];
        }
    }
}

// ---new_ra_browser---
function post_author_works(...args) {
    const input = args[0];
    
    // alert da cambiare
    if (!Array.isArray(input) || input.length <= 1) {
        return [
            ['count', 'pubList', 'pubYears'],
            [0, '<div class="alert alert-light">No works found.</div>', []]
        ];
    }

    const total_count = input.length - 1;

    let full_html_list = '<div class="list-group list-group-flush">';

    const pubYears = [];

    for (let i = 1; i < input.length; i++) {
        const row = input[i];
        
        const uri_raw = row[0] || "";
        const title_raw = row[1] || "Untitled Work";
        const date_raw = row[2] || "n.d.";
        const ids_raw = row[4] || ""; 

        const omid = _get_omid_digit(uri_raw);
        const internal_link = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=br/${omid}`;

        const year = date_raw.split("-")[0];

        if (year !== "n.d.") {
            pubYears.push(year);
        }

        const id_badges = _generate_id_badges(ids_raw);

        const item_html = `
            <div class="list-group-item p-3 mb-2 border rounded shadow-sm bg-white">
                <div class="d-flex w-100 justify-content-between align-items-center mb-2">
                    <h5 class="mb-1" style="font-size: 1.1rem;">
                        <a href="${internal_link}" class="text-dark text-decoration-none fw-bold">${title_raw}</a>
                    </h5>
                    <span class="badge bg-light text-dark border">${year}</span>
                </div>
                <div class="mb-1 small">
                    ${id_badges}
                </div>
            </div>
        `;
        
        full_html_list += item_html;
    }

    full_html_list += '</div>';

    // return single raw
    return [
        ['count', 'pubList', 'pubYears'],
        [total_count, full_html_list, pubYears]
    ];

    // --- Helpers ---
    function _get_omid_digit(uri) {
        const match = uri.match(/\/br\/(\d+)$/);
        return match ? match[1] : "";
    }

    function _generate_id_badges(id_string) {
        if (!id_string) return "";

        return id_string.split("|").map(token => {
            const parts = token.trim().split(":");
            if (parts.length < 2) return token;

            const scheme = parts[0].toLowerCase();
            const value = parts.slice(1).join(":"); 
            
            let url = "#";
            if (scheme === "doi") url = `https://doi.org/${value}`;
            else if (scheme === "pmid") url = `https://pubmed.ncbi.nlm.nih.gov/${value}/`;
            
            else if (scheme === "openalex") url = `https://openalex.org/${value}`;
            else if (scheme === "omid") url = `https://w3id.org/oc/meta/${value}`;

            const visibleText = `<strong>${scheme}</strong>:${value}`;

            if (url !== "#") {
                return `<a href="${url}" target="_blank" class="text-dark text-decoration-none">${visibleText}</a>`;
            }
            
            return visibleText;

        }).join(" • ");
    }
}



// ---new_ra_browser--- 
function strip_ra(args) {
    if (!args || args.length === 0) return [];
    let id = args[0];
    if (typeof id === 'string') {
        return [id.replace(/^(omid:)?ra\//, "")];
    }
    return [id];
}

// ---new_ra_browser---
// chart postporcess dates from api
function post_author_chart_data(...args) {
    let data = args[0];
    
    // header match with .hf file
    let header = ["pub_date"];
    
    if (!Array.isArray(data) || data.length === 0) {
        return [header, []];
    }

    // dates extraction
    let rows = data.map(item => {
        return [item.pub_date || ""];
    });

    return [header, ...rows];
}

// ---doc_free_text---aut_free_text---venue_free_text---
function post_search_ids(args) {
    
    console.log("Lightweight Search Input:", args);
    const header = ["ids"];
    const omids = [];

   
    for (let i = 1; i < args.length; i++) {
        let uri = args[i][0]; 
        if (uri) {
            
            let parts = uri.split('/ra/');
            if (parts.length > 1) {
                omids.push(parts[1]);
            } else {
                
                omids.push(uri);
            }
        }
    }
    
    const ids_string = omids.join('|');
    
    const result = [header, [ids_string]];
    
    console.log("Extracted IDs:", ids_string);
    return result;
}


//---doc_free_text---
function api_search() {
    console.log("=== API_SEARCH CALLED (JSON VENUE PARSING) ===");
    
    const resultsContainer = document.getElementById('search-results-container');
    
    // if data
    if (!Lucinda.data.search_ids || Lucinda.data.search_ids.length < 2) {
         if (resultsContainer) resultsContainer.innerHTML = '<div class="col-12"><p>No results found.</p></div>';
         return "No IDs found";
    }

    const idsString = Lucinda.data.search_ids[1][0];
    if (!idsString) return "No ID String";

    // batch ids list
    const idList = idsString.split(/[\s|]+/).filter(s => s.trim() !== "");
    const BATCH_SIZE = 20; 
    const batches = [];
    
    for (let i = 0; i < idList.length; i += BATCH_SIZE) {
        batches.push(idList.slice(i, i + BATCH_SIZE));
    }

    resultsContainer.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading metadata...</p></div>';

    // get batches
    const fetchPromises = batches.map(batch => {
        const idsStringConverted = batch.map(url => {
            const id = url.split('/').pop(); 
            return `omid:br/${id}`;
        }).join('__');

        const apiUrl = `https://api.opencitations.net/meta/v1/metadata/${idsStringConverted}`;
        
        return fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error("Batch fetch error:", error);
                return []; 
            });
    });

    Promise.all(fetchPromises)
        .then(results => {
            const allData = results.flat(); 
            const dataItems = Object.values(allData);
            
            if (dataItems.length === 0) {
                resultsContainer.innerHTML = '<div class="col-12"><p>No metadata found.</p></div>';
                return;
            }

            let html = '<div class="row">';
            
            for (let i = 0; i < dataItems.length; i++) {
                const item = dataItems[i];
                
                let primaryOmidValue = null;
                const idParts = item.id ? item.id.split(' ') : [];
                const omidEntry = idParts.find(part => part.startsWith('omid:'));
                if (omidEntry) {
                    primaryOmidValue = omidEntry.replace('omid:br/', '');
                }
                if (!primaryOmidValue) continue;

                // --- helper crete links ---
                const createIdLinks = (idString) => {
                    if (!idString) return "";

                    return idString.split(/[\s|]+/).map(token => {
                        const parts = token.split(':');
                        if (parts.length < 2) return token;
                        const scheme = parts[0].toLowerCase();
                        const val = parts.slice(1).join(':');
                        
                        let url = "#";
                        if (scheme === 'doi') url = `https://doi.org/${val}`;
                        else if (scheme === 'issn') url = `https://portal.issn.org/resource/ISSN/${val}`;
                        else if (scheme === 'pmid') url = `https://pubmed.ncbi.nlm.nih.gov/${val}/`;
                       
                        else if (scheme === 'openalex') url = `https://openalex.org/${val}`;
                        else if (scheme === 'omid') url = `https://w3id.org/oc/meta/${val}`;

                        if (url !== "#") {
                            return `<a href="${url}" target="_blank" class="text-dark text-decoration-none">${scheme}:${val}</a>`;
                        }
                        return `${scheme}:${val}`;
                    }).join(' • ');
                };

                // fotmat authors with links
                let formattedAuthors = "Unknown";
                if (item.author) {
                    formattedAuthors = item.author.split(';').map(authStr => {
                        const trimmed = authStr.trim();
     
                        const nameMatch = trimmed.match(/^([^\[]+)\s*\[/);
                        const name = nameMatch ? nameMatch[1].trim() : trimmed;
                        
                        const raMatch = trimmed.match(/omid:ra\/([\w\d]+)/);
                        const omid = raMatch ? raMatch[1] : null;
                        
                        const orcidMatch = trimmed.match(/orcid:([\d-X]+)/i);
                        const orcid = orcidMatch ? orcidMatch[1] : null;

                        let parts = [];
                        if (omid) {
                            parts.push(`<a href=http://127.0.0.1:5500/example/oc/html_template/browser.html?value=ra/${omid} target="_blank" class="text-dark text-decoration-none">${name}</a>`);
                        } else {
                            parts.push(`<span>${name}</span>`);
                        }
                        if (orcid)  {
                            parts.push(`(<a href="https://orcid.org/${orcid}" target="_blank">${orcid}</a>)`);
                        }
                        return parts.join(' ');
                        
                    }).join(' • ');
                }

                // format venue with links
                let formattedSource = "";
                const venueRaw = item.venue || item.source_title || "";
                
                if (venueRaw) {
                    let venueTitle = venueRaw;
                    let venueIdsString = "";

                    const match = venueRaw.match(/^(.*?)\s*\[([^\]]+)\]$/);
                    
                    if (match) {
                        venueTitle = match[1].trim();
                        venueIdsString = match[2].trim();
                    }

                    const idTokens = venueIdsString.split(/\s+/).filter(s => s.trim() !== "");
                    
                    const omidToken = idTokens.find(t => t.startsWith("omid:"));
                    let venueLink = "#";
                    
                    if (omidToken) {
                         const cleanOmid = omidToken.replace("omid:", "");
                         venueLink = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=${cleanOmid}`;
                    }
                    
                    const displayIdTokens = idTokens.filter(t => t !== omidToken);
                    const linkedIds = createIdLinks(displayIdTokens.join(" "));

                    const titleHtml = (venueLink !== "#") 
                        ? `<a href="${venueLink}" target="_blank" class="text-dark text-decoration-none"><i>${venueTitle}</i></a>` 
                        : `<i>${venueTitle}</i>`;
                        
                    formattedSource = linkedIds 
                        ? `${titleHtml} (${linkedIds})` 
                        : titleHtml;
                }

                // doc ids
                const formattedIds = item.id ? createIdLinks(item.id) : 'No ID';

                const ocRecordUrl = `browser.html?value=br/${primaryOmidValue}`;
                const refUrl = `browser.html?value=doc_ref/br/${primaryOmidValue}`;
                const citUrl = `browser.html?value=doc_cit/br/${primaryOmidValue}`;

                html += `
                <div class="col-12 mb-3">
                  <div class="card shadow-sm p-2 "> 
                      <div class="card-body p-3 d-flex flex-column">
                          
                          <h5 class="card-title mb-2">
                              <a href="${ocRecordUrl}" target="_blank">${item.title || 'No title'}</a>
                          </h5>
                          <hr>
                          
                          <div class="mb-2">
                            <span class="metadata-label fw-bold">Authors:</span> <br>
                            <span>${formattedAuthors}</span>
                          </div>

                          <div class="mb-2">
                            <span class="metadata-label fw-bold">Identifiers:</span> <br>
                            <span >${formattedIds}</span>
                          </div>  
                          <div class="mb-2">
                            <span class="metadata-label fw-bold">Publication Date:</span><br>
                            <span>${item.pub_date || 'Unknown'}</span>
                          </div>                       

                          ${formattedSource ? `
                          <div class="mb-2">
                             <span class="metadata-label fw-bold">Source:</span> <br>
                             <span>${formattedSource}</span>
                          </div>` : ''}
                          
    
                      </div> 
                      
                      <div class="d-flex justify-content-end px-3 pb-2 gap-2">
                          <a href="${refUrl}" class="btn btn-sm " target="_blank">Go to References</a>
                          <a href="${citUrl}" class="btn btn-sm " target="_blank">Go to Citations</a>
                      </div>
                  </div>
                </div>`;
            }
            html += '</div>';
            resultsContainer.innerHTML = html;
        })
        .catch(error => {
            console.error('API Search Error:', error);
            resultsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error loading results: ${error.message}</div></div>`;
        });

    return "Search initiated";
}


// ---new_venue_browser---
function post_venue_meta(...args) {
    let alldata = args[0];
    let is_json_source = false;

    if (alldata && alldata.results && alldata.results.bindings) {
        alldata = __normalise_bindings(alldata);
        is_json_source = true;
    }

    if (!Array.isArray(alldata) || alldata.length === 0) {
        return [["Title", "Identifiers"], ["—", "—"]];
    }

    let row = [];
    if (is_json_source) {
        row = alldata[0];
    } else {
       
        if (alldata.length > 1) {
            row = alldata[1];
        }
    }

    if (!row) {
         return [["Title", "Identifiers"], ["—", "—"]];
    }

    const title = (row[0] || "").trim();
    const ids = (row[1] || "").trim();
    
    const formattedIds = ids.split('|').map(id => {
        const parts = id.trim().split(':');
        
        if (parts.length < 2) return id;

        const scheme = parts[0].toLowerCase();
        const value = parts.slice(1).join(':');

        let url = "#";
        // link format for venuess
        if (scheme === "doi") url = `https://doi.org/${value}`;
        else if (scheme === "issn") url = `https://portal.issn.org/resource/ISSN/${value}`;
        else if (scheme === "omid") url = `https://w3id.org/oc/meta/${value}`;
        else if (scheme === "openalex") url = `https://openalex.org/${value}`;
        else if (scheme === "pmid") url = `https://pubmed.ncbi.nlm.nih.gov/${value}/`;

        const visibleText = `<strong>${parts[0]}</strong>:${value}`;

        if (url !== "#") {
            return `<a href="${url}" target="_blank" class="text-dark text-decoration-none">${visibleText}</a>`;
        }
        return visibleText;
    }).join(' • '); // Dot separator

    return [
        ["Title", "Identifiers"],
        [title, formattedIds]
    ];

    function __normalise_bindings(json) {
        try {
            return json.results.bindings.map(b =>
                ["title", "identifiers"]
                    .map(k => b[k]?.value || "")
            );
        } catch (_) {
            return [];
        }
    }
}




// ---new_venue_browser---
function post_venue_works(...args) {
    const input = args[0];

    if (!Array.isArray(input) || input.length <= 1) {
        return [
            ['count', 'pubList', 'years_pipe'], 
            [0, '<div class="alert alert-light">No publications found.</div>', ""]
        ];
    }

    const total_count = input.length - 1;
    let full_html_list = '<div class="list-group list-group-flush">';
    let all_years = []; // Store years for chart

    for (let i = 1; i < input.length; i++) {
        const row = input[i];
 
        const uri_raw = row[0] || "";
        const title_raw = row[1] || "Untitled Article";
        const date_raw = row[2] || "n.d.";
        const ids_raw = row[3] || ""; 

        const omid = _get_omid_digit(uri_raw);
        const internal_link = `browser.html?value=br/${omid}`;

        const year = date_raw.split("-")[0];
        if (year && year !== "n.d.") {
            all_years.push(year);
        }

        const id_badges = _generate_id_badges(ids_raw);

        full_html_list += `
            <div class="list-group-item p-3 mb-2 border rounded shadow-sm bg-white">
                <div class="d-flex w-100 justify-content-between align-items-center mb-2">
                    <h5 class="mb-1" style="font-size: 1.1rem;">
                        <a href="${internal_link}" class="text-dark text-decoration-none fw-bold">${title_raw}</a>
                    </h5>
                    <span class="badge bg-light text-dark border">${year}</span>
                </div>
                <div class="mb-1 small">${id_badges}</div>
            </div>`;
    }

    full_html_list += '</div>';

    return [
        ['count', 'pubList', 'years_pipe'],     
        [total_count, full_html_list, all_years.join('|')] 
    ];
    
    // --- helpers ---
    function _get_omid_digit(uri) {
        if (!uri) return "";
        const match = uri.match(/\/br\/(\d+)$/);
        return match ? match[1] : "";
    }

    function _generate_id_badges(id_string) {
        if (!id_string) return "";

        return id_string.split("|").map(token => {
            const parts = token.trim().split(":");
            
            if (parts.length < 2) return token;

            const scheme = parts[0].toLowerCase();
            
            const value = parts.slice(1).join(":"); 
            
            //url format
            let url = "#";
            if (scheme === "doi") url = `https://doi.org/${value}`;
            else if (scheme === "pmid") url = `https://pubmed.ncbi.nlm.nih.gov/${value}/`;
            
            else if (scheme === "openalex") url = `https://openalex.org/${value}`;
            else if (scheme === "omid") url = `https://w3id.org/oc/meta/${value}`;

            const visibleText = `<strong>${scheme}</strong>:${value}`;

            if (url !== "#") {
            
                return `<a href="${url}" target="_blank" class="text-dark text-decoration-none">${visibleText}</a>`;
            }
            
            return visibleText;

        }).join(" • "); 
    }
}


// ---aut_free_text---
function api_search_author() {
    console.log("=== API_SEARCH_AUTHOR (STYLED WITH BR) CALLED ===");

    const resultsContainer = document.getElementById('search-results-container');
    
    // ids check
    if (!Lucinda.data.search_ids || Lucinda.data.search_ids.length < 2) {
        if(resultsContainer) resultsContainer.innerHTML = '<div class="col-12"><p>No results found.</p></div>';
        return;
    }
    
    // get pipe string
    const idsString = Lucinda.data.search_ids[1][0];
    if (!idsString) return;


    const idList = idsString.split('|');
    
    const valuesClause = idList
        .map(id => `<https://w3id.org/oc/meta/ra/${id}>`) 
        .join(' ');

    // additional metadata for author
    const sparqlQuery = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX datacite: <http://purl.org/spar/datacite/>
        PREFIX literal: <http://www.essepuntato.it/2010/06/literalreification/>
        
        SELECT ?agent (SAMPLE(?combinedName) as ?name) (SAMPLE(?orcidVal) as ?orcid)
        WHERE {
            # Only look at the IDs we already found
            VALUES ?agent { ${valuesClause} }
            
            # 1. Get Name parts
            OPTIONAL { ?agent foaf:name ?fullName }
            OPTIONAL { ?agent foaf:givenName ?gName }
            OPTIONAL { ?agent foaf:familyName ?fName }
            
            # 2. Build Display Name
            BIND(COALESCE(?fullName, CONCAT(?gName, " ", ?fName), "Unknown Name") AS ?combinedName)
            
            # 3. Get ORCID
            OPTIONAL { 
                ?agent datacite:hasIdentifier ?idRes .
                ?idRes datacite:usesIdentifierScheme datacite:orcid ;
                       literal:hasLiteralValue ?orcidVal .
            }
        }
        GROUP BY ?agent
    `;

    resultsContainer.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading author details...</p></div>';

    const sparqlEndpoint = "https://opencitations.net/meta/sparql"; 

    fetch(sparqlEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: 'query=' + encodeURIComponent(sparqlQuery)
    })
    .then(response => {
        if (!response.ok) throw new Error(`SPARQL Error ${response.status}`);
        return response.json();
    })
    .then(data => {
        const bindings = data.results.bindings;
        
        if (!bindings || bindings.length === 0) {
            resultsContainer.innerHTML = '<p>No author details found.</p>';
            return;
        }

        let html = '<div class="row">';
        
        bindings.forEach(row => {
            const agentUri = row.agent.value; 
            const shortId = agentUri.split('/ra/')[1]; 
            const name = row.name ? row.name.value : "Unknown Name";
            
            // ocird links
            const orcidVal = row.orcid ? row.orcid.value : null;
            let orcidHtml = '<span class="text-muted p-4"><em>No ORCID found<em></span>';
            if (orcidVal) {
                orcidHtml = `<a href="https://orcid.org/${orcidVal}" target="_blank" class="text-dark text-decoration-none">${orcidVal}</a>`;
            }

            const linkUrl = `browser.html?value=ra/${shortId}`; 

            html += `
            <div class="col-12 mb-3">
                <div class="card shadow-sm p-2"> 
                    <div class="card-body p-3 d-flex flex-column">
                        <h5 class="card-title mb-2">
                            <a href="${linkUrl}" target="_blank">${name}</a>
                        </h5>
                        <hr>
                        
                        <div class="mb-2">
                            <span class="metadata-label fw-bold">ORCID:</span><br>
                            <span>${orcidHtml}</span>
                        </div>
                        
                        <div class="mb-2">
                            <span class="metadata-label fw-bold">Other identifiers:</span><br>
                            <span class=""><a href="https://w3id.org/oc/meta/ra/${shortId}" target="_blank">omid:br/${shortId}</a></span>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        
        html += '</div>';
        resultsContainer.innerHTML = html;
    })
    .catch(error => {
        console.error("SPARQL Fetch failed:", error);
        resultsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error: ${error.message}</div></div>`;
    });
}



// ---venue_free_text---
function api_search_venue() {
    console.log("=== API_SEARCH_VENUE (DEBUG MODE) ===");

    const resultsContainer = document.getElementById('search-results-container');

    if (!Lucinda.data.search_ids || Lucinda.data.search_ids.length < 2) {
        if(resultsContainer) resultsContainer.innerHTML = '<div class="col-12"><p>No results found.</p></div>';
        return;
    }

    const idsString = Lucinda.data.search_ids[1][0];
    if (!idsString) return;

    //batches
    const idList = idsString.split(/[\s|]+/).filter(s => s.trim() !== "");
    const BATCH_SIZE = 20; 
    const batches = [];
    
    for (let i = 0; i < idList.length; i += BATCH_SIZE) {
        batches.push(idList.slice(i, i + BATCH_SIZE));
    }

    resultsContainer.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading venue details...</p></div>';

    const fetchPromises = batches.map(batch => {
        const idsStringConverted = batch.map(id => {
            const cleanId = id.split('/').pop(); 
            return `omid:br/${cleanId}`;
        }).join('__');

        const apiUrl = `https://api.opencitations.net/meta/v1/metadata/${idsStringConverted}`;

        
        return fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error("Batch fetch error:", error);
                return []; 
            });
    });

    Promise.all(fetchPromises)
        .then(results => {
            const allData = results.flat(); 
            const dataItems = Object.values(allData);
            
            if (dataItems.length === 0) {
                resultsContainer.innerHTML = '<div class="col-12"><p>No venue details found.</p></div>';
                return;
            }

            let html = '<div class="row">';
            
            // helpers
            const createIdLinks = (idString) => {
                if (!idString) return "—";
                return idString.split(/[\s|]+/).map(token => {
                    const parts = token.split(':');
                    if (parts.length < 2) return token;
                    const scheme = parts[0].toLowerCase();
                    const val = parts.slice(1).join(':');
                    let url = "#";
                    if (scheme === 'doi') url = `https://doi.org/${val}`;
                    else if (scheme === 'issn') url = `https://portal.issn.org/resource/ISSN/${val}`;
                    else if (scheme === 'pmid') url = `https://pubmed.ncbi.nlm.nih.gov/${val}/`;
                    else if (scheme === 'openalex') url = `https://openalex.org/${val}`;
                    else if (scheme === 'omid') url = `https://w3id.org/oc/meta/${val}`;
                    if (url !== "#") return `<a href="${url}" target="_blank" class="text-dark text-decoration-none">${scheme}:${val}</a>`;
                    return `${scheme}:${val}`;
                }).join(' • ');
            };

            const parseAgent = (agentStr) => {
                if (!agentStr) return "";
                const trimmed = agentStr.trim();
                const nameMatch = trimmed.match(/^([^\[]+)\s*\[/);
                const name = nameMatch ? nameMatch[1].trim() : trimmed;
                const idsMatch = trimmed.match(/\[(.*?)\]/);
                const idsString = idsMatch ? idsMatch[1] : "";
                
                let omidLink = "#";
                let otherIds = [];
                if (idsString) {
                    const tokens = idsString.split(/\s+/);
                    const omidToken = tokens.find(t => t.startsWith('omid:'));
                    if (omidToken) {
                        const omidVal = omidToken.replace('omid:ra/', '').replace('omid:', '');
                        omidLink = `https://w3id.org/oc/meta/ar/${omidVal}`;
                    }
                    otherIds = tokens.filter(t => !t.startsWith('omid:'));
                }
                let nameHtml = (omidLink !== "#") ? `<a href="${omidLink}" target="_blank" class="text-dark text-decoration-none">${name}</a>` : `<span>${name}</span>`;
                let idsHtml = otherIds.length > 0 ? ` <span class="small text-muted">(${createIdLinks(otherIds.join(' '))})</span>` : "";
                return nameHtml + idsHtml;
            };

            for (let i = 0; i < dataItems.length; i++) {
                const item = dataItems[i];

                
                let shortId = "";
                const idParts = item.id ? item.id.split(' ') : [];
                const omidEntry = idParts.find(part => part.startsWith('omid:'));
                if (omidEntry) {
                    shortId = omidEntry.replace('omid:br/', '').replace('omid:', '');
                }
                if (!shortId) continue; 

                const linkUrl = `browser.html?value=br/${shortId}`;
                const title = item.title || "Unknown Title";
                const pubDate = item.pub_date || ""; 
                const formattedIds = item.id ? createIdLinks(item.id) : "—";
                let publisherHtml = item.publisher ? item.publisher.split(';').map(parseAgent).join(' • ') : "";
                let editorHtml = item.editor ? item.editor.split(';').map(parseAgent).join(' • ') : "";

                html += `
                <div class="col-12 mb-3">
                    <div class="card shadow-sm p-2"> 
                        <div class="card-body p-3 d-flex flex-column">
                            <h5 class="card-title mb-2">
                                <a href="${linkUrl}" target="_blank">${title}</a>
                            </h5>
                            <hr>
                            <div class="mb-2"><span class="metadata-label fw-bold">Identifiers:</span><br><span class="small">${formattedIds}</span></div>
                            ${pubDate ? `<div class="mb-2"><span class="metadata-label fw-bold">Date:</span><br><span>${pubDate}</span></div>` : ''}
                            ${publisherHtml ? `<div class="mb-2"><span class="metadata-label fw-bold">Publisher:</span><br><span>${publisherHtml}</span></div>` : ''}
                            ${editorHtml ? `<div class="mb-2"><span class="metadata-label fw-bold">Editor:</span><br><span>${editorHtml}</span></div>` : ''}
                        </div>
                    </div>
                </div>`;
            }
            html += '</div>';
            resultsContainer.innerHTML = html;
        })
        .catch(error => {
            console.error("API Search failed:", error);
            resultsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error: ${error.message}</div></div>`;
        });
}

// ---doc_citations---doc_references---
function post_search_ids2(args) {
    
    const header = ["ids"];
    const extracted_ids = [];

    for (let i = 1; i < args.length; i++) {
        let uri = args[i][0]; 
        if (uri) {
            
            let match = uri.match(/\/(br|ra)\/(\d+)/);
            if (match) {
                
                extracted_ids.push(`${match[1]}/${match[2]}`);
            } else {
                
                let lastPart = uri.split('/').filter(s => s.trim() !== "").pop();
                if (lastPart) extracted_ids.push(lastPart);
            }
        }
    }
    
    const ids_string = extracted_ids.join('|');
    return [header, [ids_string]];
}


// ---doc_citations---doc_references---
function load_metadata_async(data_key) {
    console.log(`=== LOAD_METADATA_ASYNC (${data_key}) START (BATCHED + STYLED) ===`);
    
    const container = document.getElementById('async-results-container');
    if (!container) return;

    if (!Lucinda.data[data_key] || Lucinda.data[data_key].length < 2) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">No records found.</div></div>';
        return;
    }

    const idsString = Lucinda.data[data_key][1][0];
    if (!idsString) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">No records found.</div></div>';
        return;
    }

    // batches
    const idList = idsString.split('|').filter(s => s.trim() !== "");
    const BATCH_SIZE = 20;
    const batches = [];
    
    for (let i = 0; i < idList.length; i += BATCH_SIZE) {
        batches.push(idList.slice(i, i + BATCH_SIZE));
    }

    container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading data...</p></div>';

    const fetchPromises = batches.map(batch => {
        // format to "omid:br/123"
        const metaIds = batch.map(id => {
            if (id.includes('/')) return `omid:${id}`;
            return `omid:br/${id}`;
        }).join('__');

        const apiUrl = `https://api.opencitations.net/meta/v1/metadata/${metaIds}`;
        
        return fetch(apiUrl)
            .then(res => {
                if (!res.ok) throw new Error(res.statusText);
                return res.json();
            })
            .catch(err => {
                console.error("Batch error:", err);
                return [];
            });
    });

    Promise.all(fetchPromises)
        .then(results => {
            const allData = results.flat();
            
            if (allData.length === 0) {
                container.innerHTML = '<div class="col-12"><p>No metadata found.</p></div>';
                return;
            }

            let html = '<div class="row">';
            
            // --- hemlper links ---
            const createIdLinks = (idString) => {
                if (!idString) return "";
                return idString.split(/[\s|]+/).map(token => {
                    const parts = token.split(':');
                    if (parts.length < 2) return token;
                    const scheme = parts[0].toLowerCase();
                    const val = parts.slice(1).join(':');
                    
                    let url = "#";
                    if (scheme === 'doi') url = `https://doi.org/${val}`;
                    else if (scheme === 'issn') url = `https://portal.issn.org/resource/ISSN/${val}`;
                    else if (scheme === 'pmid') url = `https://pubmed.ncbi.nlm.nih.gov/${val}/`;
                    else if (scheme === 'openalex') url = `https://openalex.org/${val}`;
                    else if (scheme === 'omid') url = `https://w3id.org/oc/meta/${val}`;

                    if (url !== "#") {
                        return `<a href="${url}" target="_blank" class="text-dark text-decoration-none">${scheme}:${val}</a>`;
                    }
                    return `${scheme}:${val}`;
                }).join(' • ');
            };

            // --- helper venues ---
            const parseVenue = (venueRaw) => {
                if (!venueRaw) return "";
                let venueTitle = venueRaw;
                let venueIdsString = "";

                const match = venueRaw.match(/^(.*?)\s*\[([^\]]+)\]$/);
                if (match) {
                    venueTitle = match[1].trim();
                    venueIdsString = match[2].trim();
                }

                const idTokens = venueIdsString.split(/\s+/).filter(s => s.trim() !== "");
                const omidToken = idTokens.find(t => t.startsWith("omid:"));
                let venueLink = "#";
                
                if (omidToken) {
                     const cleanOmid = omidToken.replace("omid:", "");
                     venueLink = `https://w3id.org/oc/meta/${cleanOmid}`;
                }
                
                const displayIdTokens = idTokens.filter(t => t !== omidToken);
                const linkedIds = createIdLinks(displayIdTokens.join(" "));

                const titleHtml = (venueLink !== "#") 
                    ? `<a href="${venueLink}" target="_blank" class="text-dark text-decoration-none"><i>${venueTitle}</i></a>` 
                    : `<i>${venueTitle}</i>`;
                    
                return linkedIds ? `${titleHtml} (${linkedIds})` : titleHtml;
            };

            allData.forEach(item => {

                let primaryOmidValue = null;
                const idParts = item.id ? item.id.split(' ') : [];
                const omidEntry = idParts.find(part => part.startsWith('omid:'));
                if (omidEntry) primaryOmidValue = omidEntry.replace('omid:br/', '');

                const ocRecordUrl = primaryOmidValue ? `browser.html?value=br/${primaryOmidValue}` : "#";
                //const refUrl = primaryOmidValue ? `browser.html?value=doc_ref/br/${primaryOmidValue}` : "#";
                //const citUrl = primaryOmidValue ? `browser.html?value=doc_cit/br/${primaryOmidValue}` : "#";

                let formattedAuthors = "Unknown";
                if (item.author) {
                    formattedAuthors = item.author.split(';').map(authStr => {
                        const trimmed = authStr.trim();
                        const nameMatch = trimmed.match(/^([^\[]+)\s*\[/);
                        const name = nameMatch ? nameMatch[1].trim() : trimmed;
                        const raMatch = trimmed.match(/omid:ra\/([\w\d]+)/);
                        const orcidMatch = trimmed.match(/orcid:([\d-X]+)/i);
                        
                        let parts = [];
                        if (raMatch) {
                            parts.push(`<a href="https://w3id.org/oc/meta/ra/${raMatch[1]}" target="_blank" class="text-dark text-decoration-none">${name}</a>`);
                        } else {
                            parts.push(`<span>${name}</span>`);
                        }
                        if (orcidMatch) {
                            parts.push(`(<a href="https://orcid.org/${orcidMatch[1]}" target="_blank">${orcidMatch[1]}</a>)`);
                        }
                        return parts.join(' ');
                    }).join(' • ');
                }

                const formattedIds = item.id ? createIdLinks(item.id) : 'No ID';
                const formattedSource = parseVenue(item.venue || item.source_title);

                html += `
                <div class="col-12 mb-3">
                  <div class="card shadow-sm p-2"> 
                      <div class="card-body p-3 d-flex flex-column">
                          <h5 class="card-title mb-2">
                              <a href="${ocRecordUrl}" target="_blank">${item.title || 'No title'}</a>
                          </h5>
                          <hr>
                          <div class="mb-2">
                            <span class="metadata-label fw-bold">Authors:</span> <br>
                            <span>${formattedAuthors}</span>
                          </div>
                          <div class="mb-2">
                            <span class="metadata-label fw-bold">Identifiers:</span> <br>
                            <span>${formattedIds}</span>
                          </div>  
                          <div class="mb-2">
                            <span class="metadata-label fw-bold">Publication Date:</span><br>
                            <span>${item.pub_date || 'Unknown'}</span>
                          </div>                       
                          ${formattedSource ? `
                          <div class="mb-2">
                             <span class="metadata-label fw-bold">Source:</span> <br>
                             <span>${formattedSource}</span>
                          </div>` : ''}
                      </div> 
                      
                  </div>
                </div>`;
            });

            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error: ${err.message}</div></div>`;
        });
}

/* 
-----------------
Helper Functions|  
-----------------
*/ 


// Creates a clickable HTML link string to the Bibliographic Resource page.
function _create_br_link_string(omid_digit) {
    if (!omid_digit) return "N/A";
    return `<a href="http://127.0.0.1:5500/example/oc/html_template/browser.html?value=br/${omid_digit}">${omid_digit}</a>`;
}

function _get_omid_digit(uri) {
    if (!uri || typeof uri !== 'string') return "";
    const match = uri.match(/\/br\/(\d+)$/);
    if (match) {
        return match[1];
    }
    return uri;
}

function extract_years_for_chart(lucinda_data_obj) {
    
    if (!lucinda_data_obj || lucinda_data_obj.length < 2) {
        return [['year'], []];
    }

    const pipe_string = lucinda_data_obj[1][0]; 
    
    if (!pipe_string) {
        return [['year'], []];
    }

    const years_list = pipe_string.split('|').filter(y => y !== "");
    

    const matrix = [['year']];
    years_list.forEach(y => {
        matrix.push([y]);
    });
    
    return matrix;
}

/*
External functions
-------------------

External functions <args> are:
 + args[0] = data based on the parameters defined
 + args[1] = Lucinda.data.main
 + args[2] = extfun_id

Once done call the following function with the spreaded <args> and the new value must be called:
Lucinda.build_extdata_view
e.g. Lucinda.build_extdata_view(
  ...args,
  [
    ["att_1","att_2"],
    [1,2],
    [3,4]
    ...
  ])

*/

// ---new_br_any_browser---
function ocapi_citations(...args) {
  return _call_oc("citations",...args);
}

// ---new_br_any_browser---
function ocapi_references(...args) {
  return _call_oc("references",...args);
}


function _call_oc(type,...args) {

  let lucinda_main_data = args[1];

  // This is via OC META API
  let omid_val = "omid:br/"+lucinda_main_data["omid_digit"];
  let pending = 0;
  let res = [];

  let id_val = Lucinda.data.main.id;
  id_val = Array.isArray(id_val) ? id_val : [id_val];
  //let omid_val = id_val.find(item => typeof item === 'string' && item.startsWith("omid:"));

  let dest = "citing";
  if (type == "references") {
    dest = "cited";
  }

  const url = "https://api.opencitations.net/index/v2/"+type+"/"+omid_val;
  fetch(url)
      .then(response => {return response.json();})
      .then(data => {
          console.log("Calling a function to get exteranldata <ocapi_references()>, ","on:",Lucinda.data, "data retrieved=",data);
          const omid_uri_vals = data
            .map(item => item[dest].match(/omid:[^\s]+/)?.[0])
            .map(item => `https://w3id.org/oc/meta/${item.replace(/^omid:/, '')}`);
          if (omid_uri_vals.length > 0) {
            _call_oc_sparql_metadata(omid_uri_vals);
          }else {
            Lucinda.build_extdata_view(...args,[]);
          }
      })
      .catch(error => {
        Lucinda.build_extdata_view(...args,"Error while retrieving the references data!");
      });

    function _call_oc_sparql_metadata(val){

        const uri_omids = val.map(item => `<${item}>`).join(' ');

        let sparql_query = `PREFIX foaf: <http://xmlns.com/foaf/0.1/> PREFIX pro: <http://purl.org/spar/pro/> PREFIX literal: <http://www.essepuntato.it/2010/06/literalreification/> PREFIX datacite: <http://purl.org/spar/datacite/> PREFIX dcterm: <http://purl.org/dc/terms/> PREFIX frbr: <http://purl.org/vocab/frbr/core#> PREFIX fabio: <http://purl.org/spar/fabio/> PREFIX prism: <http://prismstandard.org/namespaces/basic/2.0/> PREFIX oco: <https://w3id.org/oc/ontology/> SELECT DISTINCT ?id (STR(?title) AS ?title) (GROUP_CONCAT(DISTINCT ?author_info; SEPARATOR="|") AS ?author) (STR(?pub_date) AS ?pub_date) (STR(?issue) AS ?issue) (STR(?volume) AS ?volume) ?venue ?type ?page (GROUP_CONCAT(DISTINCT ?publisher_info; SEPARATOR="|") AS ?publisher) (GROUP_CONCAT(DISTINCT ?combined_editor_info; SEPARATOR="|") AS ?editor) WHERE { { SELECT ?res ?title ?author_info ?combined_editor_info ?publisher_info ?type ?pub_date ?page ?issue ?volume ?venueName ?venueMetaid (GROUP_CONCAT(DISTINCT ?id ; SEPARATOR=" ") AS ?ids) (GROUP_CONCAT(DISTINCT ?venue_ids_; SEPARATOR=' ') AS ?venue_ids) WHERE { VALUES ?res { ${uri_omids} } OPTIONAL { ?res datacite:hasIdentifier ?allIdentifiers. ?allIdentifiers datacite:usesIdentifierScheme ?allSchemes; literal:hasLiteralValue ?allLiteralValues. BIND(CONCAT(STRAFTER(STR(?allSchemes), "http://purl.org/spar/datacite/"), ":", ?allLiteralValues) AS ?id) } OPTIONAL { ?res pro:isDocumentContextFor ?arAuthor. ?arAuthor pro:withRole pro:author; pro:isHeldBy ?raAuthor. OPTIONAL { ?arAuthor oco:hasNext ?nextAuthorRole . } BIND(STRAFTER(STR(?arAuthor), "https://w3id.org/oc/meta/ar/") AS ?roleUri) BIND(STRAFTER(STR(?nextAuthorRole), "https://w3id.org/oc/meta/ar/") AS ?nextRoleUri) BIND(CONCAT("omid:ra/", STRAFTER(STR(?raAuthor), "/ra/")) AS ?author_metaid) OPTIONAL {?raAuthor foaf:familyName ?familyName.} OPTIONAL {?raAuthor foaf:givenName ?givenName.} OPTIONAL {?raAuthor foaf:name ?name.} OPTIONAL { ?raAuthor datacite:hasIdentifier ?authorIdentifier. ?authorIdentifier datacite:usesIdentifierScheme ?authorIdSchema; literal:hasLiteralValue ?authorIdLiteralValue. BIND(CONCAT(STRAFTER(STR(?authorIdSchema), "http://purl.org/spar/datacite/"), ":", ?authorIdLiteralValue) AS ?author_id) } BIND( IF( STRLEN(STR(?familyName)) > 0 && STRLEN(STR(?givenName)) > 0, CONCAT(?familyName, ", ", ?givenName), IF( STRLEN(STR(?familyName)) > 0, CONCAT(?familyName, ","), ?name ) ) AS ?authorName) BIND( IF( STRLEN(STR(?author_id)) > 0, CONCAT(?authorName, " [", ?author_id, " ", ?author_metaid, "]"), CONCAT(?authorName, " [", ?author_metaid, "]") ) AS ?author_) BIND(CONCAT(?author_, ":", ?roleUri, ":", COALESCE(?nextRoleUri, "")) AS ?author_info) } OPTIONAL { ?res pro:isDocumentContextFor ?arEditor. ?arEditor pro:withRole pro:editor; pro:isHeldBy ?raEditor. OPTIONAL { ?arEditor oco:hasNext ?nextEditorRole . } BIND(STRAFTER(STR(?arEditor), "https://w3id.org/oc/meta/ar/") AS ?editorRoleUri) BIND(STRAFTER(STR(?nextEditorRole), "https://w3id.org/oc/meta/ar/") AS ?nextEditorRoleUri) BIND(CONCAT("omid:ra/", STRAFTER(STR(?raEditor), "/ra/")) AS ?editor_metaid) OPTIONAL {?raEditor foaf:familyName ?editorFamilyName.} OPTIONAL {?raEditor foaf:givenName ?editorGivenName.} OPTIONAL {?raEditor foaf:name ?editor_name.} OPTIONAL { ?raEditor datacite:hasIdentifier ?editorIdentifier. ?editorIdentifier datacite:usesIdentifierScheme ?editorIdSchema; literal:hasLiteralValue ?editorIdLiteralValue. BIND(CONCAT(STRAFTER(STR(?editorIdSchema), "http://purl.org/spar/datacite/"), ":", ?editorIdLiteralValue) AS ?editor_id) } BIND( IF( STRLEN(STR(?editorFamilyName)) > 0 && STRLEN(STR(?editorGivenName)) > 0, CONCAT(?editorFamilyName, ", ", ?editorGivenName), IF( STRLEN(STR(?editorFamilyName)) > 0, CONCAT(?editorFamilyName, ","), ?editor_name ) ) AS ?editorName) BIND( IF( STRLEN(STR(?editor_id)) > 0, CONCAT(?editorName, " [", ?editor_id, " ", ?editor_metaid, "]"), CONCAT(?editorName, " [", ?editor_metaid, "]") ) AS ?editor_) BIND(CONCAT(?editor_, ":", ?editorRoleUri, ":", COALESCE(?nextEditorRoleUri, "")) AS ?editor_info) } OPTIONAL { ?res frbr:partOf ?container. ?container pro:isDocumentContextFor ?arContainerEditor. ?arContainerEditor pro:withRole pro:editor; pro:isHeldBy ?raContainerEditor. OPTIONAL { ?arContainerEditor oco:hasNext ?nextContainerEditorRole . } BIND(STRAFTER(STR(?arContainerEditor), "https://w3id.org/oc/meta/ar/") AS ?containerEditorRoleUri) BIND(STRAFTER(STR(?nextContainerEditorRole), "https://w3id.org/oc/meta/ar/") AS ?nextContainerEditorRoleUri) BIND(CONCAT("omid:ra/", STRAFTER(STR(?raContainerEditor), "/ra/")) AS ?container_editor_metaid) OPTIONAL {?raContainerEditor foaf:familyName ?containerEditorFamilyName.} OPTIONAL {?raContainerEditor foaf:givenName ?containerEditorGivenName.} OPTIONAL {?raContainerEditor foaf:name ?container_editor_name.} OPTIONAL { ?raContainerEditor datacite:hasIdentifier ?containerEditorIdentifier. ?containerEditorIdentifier datacite:usesIdentifierScheme ?containerEditorIdSchema; literal:hasLiteralValue ?containerEditorIdLiteralValue. BIND(CONCAT(STRAFTER(STR(?containerEditorIdSchema), "http://purl.org/spar/datacite/"), ":", ?containerEditorIdLiteralValue) AS ?container_editor_id) } BIND( IF( STRLEN(STR(?containerEditorFamilyName)) > 0 && STRLEN(STR(?containerEditorGivenName)) > 0, CONCAT(?containerEditorFamilyName, ", ", ?containerEditorGivenName), IF( STRLEN(STR(?containerEditorFamilyName)) > 0, CONCAT(?containerEditorFamilyName, ","), ?container_editor_name ) ) AS ?containerEditorName) BIND( IF( STRLEN(STR(?container_editor_id)) > 0, CONCAT(?containerEditorName, " [", ?container_editor_id, " ", ?container_editor_metaid, "]"), CONCAT(?containerEditorName, " [", ?container_editor_metaid, "]") ) AS ?container_editor_) BIND(CONCAT(?container_editor_, ":", ?containerEditorRoleUri, ":", COALESCE(?nextContainerEditorRoleUri, "")) AS ?container_editor_info) } BIND( IF(BOUND(?editor_info), IF(BOUND(?container_editor_info), CONCAT(?editor_info, "|", ?container_editor_info), ?editor_info), IF(BOUND(?container_editor_info), ?container_editor_info, "") ) AS ?combined_editor_info) OPTIONAL { ?res pro:isDocumentContextFor ?arPublisher. ?arPublisher pro:withRole pro:publisher; pro:isHeldBy ?raPublisher. OPTIONAL { ?arPublisher oco:hasNext ?nextPublisherRole . } BIND(STRAFTER(STR(?arPublisher), "https://w3id.org/oc/meta/ar/") AS ?publisherRoleUri) BIND(STRAFTER(STR(?nextPublisherRole), "https://w3id.org/oc/meta/ar/") AS ?nextPublisherRoleUri) ?raPublisher foaf:name ?publisherName_. BIND(CONCAT("omid:ra/", STRAFTER(STR(?raPublisher), "/ra/")) AS ?publisher_metaid) ?raPublisher foaf:name ?publisher_name. OPTIONAL { ?raPublisher datacite:hasIdentifier ?publisherIdentifier__. ?publisherIdentifier__ datacite:usesIdentifierScheme ?publisherIdSchema; literal:hasLiteralValue ?publisherIdLiteralValue. BIND(CONCAT(STRAFTER(STR(?publisherIdSchema), "http://purl.org/spar/datacite/"), ":", ?publisherIdLiteralValue) AS ?publisher_id) } BIND( IF( STRLEN(STR(?publisher_id)) > 0, CONCAT(?publisher_name, " [", ?publisher_id, " ", ?publisher_metaid, "]"), CONCAT(?publisher_name, " [", ?publisher_metaid, "]") ) AS ?publisher_) BIND(CONCAT(?publisher_, ":", ?publisherRoleUri, ":", COALESCE(?nextPublisherRoleUri, "")) AS ?publisher_info) } OPTIONAL { { ?res a fabio:JournalArticle; frbr:partOf+ ?journal. BIND(CONCAT("omid:br/", STRAFTER(STR(?journal), "/br/")) AS ?venueMetaid) ?journal a fabio:Journal. } UNION { ?res frbr:partOf ?journal. BIND(CONCAT("omid:br/", STRAFTER(STR(?journal), "/br/")) AS ?venueMetaid) } ?journal dcterm:title ?venueName. OPTIONAL { ?journal datacite:hasIdentifier ?journalIdentifier__. ?journalIdentifier__ datacite:usesIdentifierScheme ?journalIdScheme; literal:hasLiteralValue ?journalIdLiteralValue. BIND(CONCAT(STRAFTER(STR(?journalIdScheme), "http://purl.org/spar/datacite/"), ":", ?journalIdLiteralValue) AS ?venue_ids_) } } OPTIONAL {?res a ?type. FILTER (?type != fabio:Expression)} OPTIONAL {?res dcterm:title ?title.} OPTIONAL {?res prism:publicationDate ?pub_date.} OPTIONAL { ?res frbr:embodiment ?re. ?re prism:startingPage ?startingPage; prism:endingPage ?endingPage. BIND(IF(STR(?startingPage) = STR(?endingPage), STR(?startingPage), CONCAT(?startingPage, '-', ?endingPage)) AS ?page) } OPTIONAL { ?res frbr:partOf ?resIssue. ?resIssue a fabio:JournalIssue; fabio:hasSequenceIdentifier ?issue. } OPTIONAL { ?res frbr:partOf+ ?resVolume. ?resVolume a fabio:JournalVolume; fabio:hasSequenceIdentifier ?volume. } } GROUP BY ?res ?title ?author_info ?combined_editor_info ?publisher_info ?type ?issue ?volume ?pub_date ?page ?venueName ?venueMetaid } BIND(CONCAT(?ids, IF(STR(?ids) != "", " ", ""), "omid:br/", STRAFTER(STR(?res), "/br/")) AS ?id) BIND( IF(BOUND(?venueMetaid), IF(STR(?venue_ids) != "", CONCAT(" [", ?venue_ids, " ", ?venueMetaid, "]"), CONCAT(" [", ?venueMetaid, "]") ), "" ) AS ?venueIdentifiers) BIND(CONCAT(?venueName, ?venueIdentifiers) AS ?venue) } GROUP BY ?id ?title ?type ?issue ?volume ?venue ?pub_date ?page `;

        let query_call = {
          "call": "https://sparql.opencitations.net/meta",
          "args": {
              headers:{
                "Accept": "application/json",
                "Content-Type": "application/sparql-query"
              },
              method: "POST",
              body: sparql_query
          }
        };

        fetch(query_call.call,query_call.args)
          .then(response => response.json())
          .then(data => {
            let fdata = [];
            let normal_data = __normal_results(data);
            if (normal_data.length > 0) {
              fdata = Lucinda_util.arrObj2matrix(
                Object.keys(normal_data[0]),
                normal_data
              );
            }

            console.log('data retrieved (and normalized in table) from endpoint:', fdata);
            Lucinda.build_extdata_view(...args, fdata);
          })
          .catch(error => {
            console.log('Error!',error);
          });

        function __normal_results(res) {
          let n_res = [];
          try {
            let entities = res["results"]["bindings"];
            for (let i = 0; i < entities.length; i++) {
              let n_obj = {};
              for (const k_att in entities[i]) {
                if (k_att == "author") {
                  n_obj[k_att] = _process_author_ordered_list(entities[i][k_att]["value"]);
                }else {
                  n_obj[k_att] = entities[i][k_att]["value"];
                }
              }
              n_res.push(n_obj);
            }
            return n_res;
          } catch (e) {console.log("error while normalizing value!");}
        }

      }

    function _get_metadata(cits,dest, i=0) {
      const match = cits[i][dest].match(/omid:[^\s]+/);
      const omid_val = match ? match[0] : null;

      if (omid_val == null) {
        pending = pending - 1;
        _get_metadata(cits,dest, i+1);
      }

      const url = "https://opencitations.net/meta/api/v1/metadata/"+omid_val;
      fetch(url)
          .then(response => {return response.json();})
          .then(data => {
            let entry = _convert_entry(data);
            res.push(entry);
            pending = pending - 1;
            if (pending > 0) {
              _get_metadata(cits,dest, i+1);
            }else {
              console.log(res);
              Lucinda.build_extdata_view(...args,res);
            }
          })
          .catch(error => {
            pending = pending - 1;
            res.push({"title":"Error while retrieving the references data!"});
            _get_metadata(cits,dest, i+1);
          });

      function _convert_entry(e){
        if (e.length > 0) {
            return e[0];
        }
        return {"title":"No metadata for this entry!"}
      }
    }


    function _process_author_ordered_list(items) {
      if (!items) return items;

      const itemsDict = {};
      const roleToName = {};

      // Split the items by "|" and parse each item
      const itemList = items.split('|');

      for (const item of itemList) {
        const parts = item.split(':');
        const name = parts.slice(0, -2).join(':');
        const currentRole = parts[parts.length - 2];
        const nextRole = parts[parts.length - 1] !== '' ? parts[parts.length - 1] : null;

        itemsDict[currentRole] = nextRole;
        roleToName[currentRole] = name;
      }

      // Find the start role (not in values of itemsDict)
      const allRoles = Object.keys(itemsDict);
      const allNextRoles = Object.values(itemsDict);
      const startRole = allRoles.find(role => !allNextRoles.includes(role));

      const orderedItems = [];
      let currentRole = startRole;

      while (currentRole) {
        orderedItems.push(roleToName[currentRole]);
        currentRole = itemsDict[currentRole];
      }

      return orderedItems.join('; ');
    }
}

/*
================================================================================
SILVIA - MIGRAZIONE SKG-IF
================================================================================
*/

/*
################################################################################
# 1. PAGINAZIONE SKG-IF (condivisa tra le risorse)
################################################################################
*/
const SKGIF_API = "https://api.opencitations.net/skg-if/v1"; // URL base di tutte le chiamate SKG-IF

const SKGIF_DEFAULT_PAGE_SIZE = 10; // risultati per pagina (come il default dell'API)

// Messaggio mostrato quando l'API non risponde.
const SKGIF_FAILED_MESSAGE = "The search failed or took too long (the API did not answer). Try again or use a shorter query.";

// Testo "Loading" mostrato mentre una lista carica.
const SKGIF_LOADING_HTML = "<div class='col-12 skgif-page-loading'>Loading the results<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span></div>";

// Numero totale di risultati di una risposta (0 se manca).
function skgifTotal(response) {
  return response?.meta?.part_of?.total_items || 0;
}

// #postprocess di Lucinda: restituisce il totale dei risultati ("–" se la chiamata è fallita).
function post_skgif_total(res) {
  const total = res.ok ? skgifTotal(res.json) : res.status === 404 ? 0 : null;
  return [["total"], [_ciCount(total)]];
}

// Scrive un conteggio solo se quello di Lucinda è fallito ("–").
function _skgifFallbackCount(elId, n) {
  const el = document.getElementById(elId);
  if (el && !/\d/.test(el.textContent)) el.textContent = String(n);
}

// Legge un valore dalla tabella che Lucinda ha salvato per un blocco.
function _lucindaValue(blockId, column) {
  return Lucinda_util.getCol(Lucinda.data[blockId], column)[1];
}

/*
Cache delle risposte già ricevute, per non rifare la stessa chiamata.
*/
const _skgifResponseCache = {};

function _skgifNormalizeUrl(url) { // rende confrontabili due URL
  let u = String(url || "").replace(/\+/g, " ");
  try { u = decodeURIComponent(u); } catch (e) { /* keep as is */ }
  return u.trim().toLowerCase();
}

// Chiamate in corso: chi chiede lo stesso URL aspetta quella già partita.
const _skgifPendingRequests = {};

// Scarica un URL SKG-IF passando dalla cache. Non dà mai errore:
// se fallisce restituisce null; 404 = nessun risultato (risposta vuota).
// Se Lucinda ha già chiesto lo stesso URL usa la sua risposta.
function skgifFetch(url, timeoutMs) {
  const fromLucinda = Lucinda.api_responses[url];
  if (fromLucinda) return fromLucinda.then(res => res.ok ? res.json : res.status === 404 ? {} : _skgifFetchUrl(url, timeoutMs));
  return _skgifFetchUrl(url, timeoutMs);
}

function _skgifFetchUrl(url, timeoutMs) {
  const key = _skgifNormalizeUrl(url);
  if (_skgifResponseCache[key]) return Promise.resolve(_skgifResponseCache[key]);
  if (_skgifPendingRequests[key]) return _skgifPendingRequests[key];
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  return _skgifPendingRequests[key] = fetch(url, controller ? { signal: controller.signal } : undefined)
    .then(r => r.ok ? r.json() : r.status === 404 ? {} : null) // 404 = 0 risultati
    .then(data => {
      if (data) _skgifResponseCache[key] = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      clearTimeout(timer);
      delete _skgifPendingRequests[key];
    });
}

// Tiene il banner "Loading" finché i primi risultati non sono pronti.
let _skgifHeldPage = null;

function holdSkgifPage() { // nasconde il template e mostra il banner
  const root = document.getElementById('__lucinda__');
  if (!root || _skgifHeldPage) return;
  const children = Array.from(root.children).map(el => ({ el, display: el.style.display }));
  children.forEach(({ el }) => { el.style.display = 'none'; });
  const banner = document.createElement('div');
  banner.id = 'lucinda_pendinghtml_main_loading';
  banner.innerHTML = "Loading the resource<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span>";
  root.appendChild(banner);
  _skgifHeldPage = { banner, children };
}

function releaseSkgifPage() { // toglie il banner e rimostra il template
  if (!_skgifHeldPage) return;
  _skgifHeldPage.banner.remove();
  _skgifHeldPage.children.forEach(({ el, display }) => { el.style.display = display; });
  _skgifHeldPage = null;
}

// Scarica TUTTE le pagine di una ricerca (servono per ordinare e per i grafici).
// onPage(n, items) viene chiamata a ogni pagina arrivata; le pagine in `have` non vengono richieste.
function skgifFetchAllPages(source, total, pageSize, parallel, onPage, have = {}) {
  const pageCount = Math.ceil(total / pageSize);
  const todo = [];
  for (let n = 1; n <= pageCount; n++) if (!have[n]) todo.push(n);
  return _skgifPool(todo, parallel, n => {
    const start = (n - 1) * pageSize;
    return skgifFetchRange(source, start, Math.min(pageSize, total - start), pageSize).then(items => onPage(n, items));
  });
}

// Esegue task(n) per ogni n di `todo`, al massimo `parallel` alla volta.
function _skgifPool(todo, parallel, task) {
  const queue = [...todo];
  const worker = () => {
    const n = queue.shift();
    return n === undefined ? Promise.resolve() : task(n).then(worker);
  };
  return Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, () => worker()));
}

// Riporta la pagina all'inizio della lista, se l'utente l'aveva superata.
function _skgifScrollToList(el) {
  if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Testo grigio sotto la barra della lista ("Loading… 150/422"); '' lo nasconde.
function _skgifSetNote(id, text) {
  const note = document.getElementById(id);
  if (!note) return;
  note.textContent = text;
  note.classList.toggle('d-none', !text);
}

// Mantiene l'altezza della lista mentre carica, così la pagina non salta.
function _skgifHoldHeight(container) {
  if (container && !container.style.minHeight) container.style.minHeight = `${container.offsetHeight}px`;
}

// Testo di stato di una lista e la sua barra di avanzamento (null = nascosta).
function _skgifListStatus(statusId, barId, text, fraction) {
  _skgifSetField(statusId, _skgifEscape(text));
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.classList.toggle('d-none', fraction === null);
  const inner = bar.querySelector('.progress-bar');
  if (inner && fraction !== null) inner.style.width = `${Math.round(fraction * 100)}%`;
}

// Liste sfogliabili: dimensione delle pagine chieste all'API e quante chiamate in parallelo.
const SKGIF_LIST_PAGE_SIZE = 50;
const SKGIF_LIST_PARALLEL = 4;
// Fino a questo numero di risultati il grafico si carica da solo; sopra serve il bottone.
const SKGIF_CHART_AUTO_LOAD = 500;
// Risultati per pagina scelti con "Per page", per ogni lista.
const _skgifPageSizes = {};

// Lista sfogliabile con Previous/Next (References/Citations della scheda documento,
// pubblicazioni dell'organizzazione). Scarica i risultati in pagine da 50 e ne mostra 10
// (o quanti scelti con "Per page"), nell'ordine dell'API. loadAll() scarica tutto (per
// grafico, filtri e ordinamento). Un risultato che non arriva diventa la card "could not be loaded".
function _skgifPagedList({ prefix, source, first, emptyMessage, noun, statusText, scrollId, renderCard, showTotal = true }) {
  const containerId = `${prefix}-list`;
  const total = first ? first.total : 0;
  const blockCount = Math.ceil(total / SKGIF_LIST_PAGE_SIZE);
  const blocks = {}; // pagina da 50 -> promessa dei risultati
  const arrived = {}; // pagina da 50 -> risultati arrivati
  const firstFull = first && first.items.length >= Math.min(SKGIF_LIST_PAGE_SIZE, total);
  if (firstFull) blocks[1] = Promise.resolve(first.items);
  const block = n => blocks[n] || (blocks[n] = skgifFetchRange(source, (n - 1) * SKGIF_LIST_PAGE_SIZE,
    Math.min(SKGIF_LIST_PAGE_SIZE, total - (n - 1) * SKGIF_LIST_PAGE_SIZE), SKGIF_LIST_PAGE_SIZE));
  const progressListeners = []; // chi segue lo scaricamento (grafico)
  const loadedListeners = []; // chi aspetta che sia tutto scaricato
  let ordered = null; // risultati ordinati/filtrati, null = ordine dell'API
  let inOrder = null; // tutti i risultati nell'ordine dell'API
  let all = null; // solo i risultati arrivati
  let loading = null;
  let page = 1;
  const pageSize = () => _skgifPageSizes[containerId] || SKGIF_DEFAULT_PAGE_SIZE;

  const paginator = { goToPage: p => show(p, true), refresh: () => show(1, true) };
  const active = () => _skgifPaginators[containerId] === paginator;
  let lastStatus = ['', null];
  const status = (text, fraction = null) => {
    lastStatus = [text, fraction];
    if (active()) _skgifListStatus(`${prefix}-status`, `${prefix}-progress`, text, fraction);
  };
  _skgifPaginators[containerId] = paginator;
  if (showTotal) _skgifSetField(`${prefix}-total`, _ciCount(first ? total : null)); // nella ricerca nei titoli il totale resta quello della lista completa
  status(first ? statusText(total) : '');

  const renderItems = items => items.map(item => item._skgifMissing ? _skgifMissingCard(noun) : renderCard(item)).join('');

  // I risultati della pagina p.
  function itemsOfPage(p) {
    const size = pageSize();
    const list = ordered || inOrder;
    if (list) return Promise.resolve(list.slice((p - 1) * size, p * size));
    if (p === 1 && first && first.items.length >= Math.min(size, total)) return Promise.resolve(first.items.slice(0, size));
    const from = (p - 1) * size;
    const to = Math.min(from + size, total);
    const firstBlock = Math.floor(from / SKGIF_LIST_PAGE_SIZE) + 1;
    const lastBlock = Math.floor((to - 1) / SKGIF_LIST_PAGE_SIZE) + 1;
    const needed = [];
    for (let n = firstBlock; n <= lastBlock; n++) needed.push(block(n));
    return Promise.all(needed).then(lists => {
      const skip = from - (firstBlock - 1) * SKGIF_LIST_PAGE_SIZE;
      return lists.flat().slice(skip, skip + (to - from));
    });
  }

  function show(p, scroll) {
    page = p;
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!active()) return; // nello stesso posto è mostrata un'altra lista
    _skgifTogglePerPage(prefix, first ? (ordered || inOrder || { length: total }).length : 0);
    if (!first || !total) container.style.minHeight = '';
    if (!first) return void (container.innerHTML = `<div class="col-12"><p>The ${noun}s could not be loaded (the API did not answer).</p></div>`);
    if (!total) return void (container.innerHTML = emptyMessage ? `<div class="col-12"><p>${_skgifEscape(emptyMessage)}</p></div>` : '');
    if (scroll) _skgifScrollToList(document.getElementById(scrollId));
    const render = items => {
      container.style.minHeight = '';
      const pageCount = Math.max(1, Math.ceil((ordered || inOrder || { length: total }).length / pageSize()));
      const cards = order === 'newest' || order === 'oldest' ? _renderAuthorWorks(items, order, renderCard) : renderItems(items); // per data: intestazione per anno
      container.innerHTML = items.length ? cards + _skgifPaginationBar(containerId, p, pageCount) : '';
    };
    const inMemory = ordered || inOrder;
    if (inMemory) return render(inMemory.slice((p - 1) * pageSize(), p * pageSize())); // lista già scaricata: mostrata subito
    _skgifHoldHeight(container);
    container.innerHTML = SKGIF_LOADING_HTML;
    itemsOfPage(p).then(items => {
      if (page !== p || !active()) return; // nel frattempo è stata chiesta un'altra pagina
      render(items);
    });
  }

  // Scarica tutte le pagine da 50; false se la lista non si legge.
  function loadAll() {
    if (loading) return loading;
    if (!first) return loading = Promise.resolve(false);
    const report = () => {
      const loaded = Math.min(Object.values(arrived).reduce((n, items) => n + items.length, 0), total);
      progressListeners.forEach(listener => listener(loaded, total));
    };
    const todo = Array.from({ length: blockCount }, (_, i) => i + 1);
    report();
    loading = _skgifPool(todo, SKGIF_LIST_PARALLEL, n => block(n).then(items => {
      arrived[n] = items;
      report();
    })).then(() => {
      inOrder = _skgifDedupe(Object.keys(arrived).sort((a, b) => a - b).flatMap(n => arrived[n]));
      all = inOrder.filter(item => !item._skgifMissing);
      const missing = inOrder.length - all.length;
      fullStatus = statusText(all.length) + (missing ? ` (${missing} could not be loaded)` : '');
      status(fullStatus);
      loadedListeners.forEach(listener => listener());
      return true;
    });
    return loading;
  }

  // Applica ordinamento, filtri e ricerca nel titolo (solo dopo loadAll()).
  let order = 'default';
  let keep = null; // filtro: funzione sul prodotto, null = nessuno
  let term = ''; // parole cercate nel titolo
  let fullStatus = '';
  function arrange() {
    if (!inOrder) return 0;
    const base = keep || term ? all.filter(p => (!keep || keep(p)) && (!term || _raTitleHas(p, term)))
      : order === 'default' ? null : all;
    ordered = base && _sortAuthorWorks(base, order);
    const found = n => `${statusText(n)} with “${term}” in the title`;
    status(term && keep ? `${ordered.length} of ${found(all.filter(p => _raTitleHas(p, term)).length)}`
      : term ? found(ordered.length) : keep ? `${ordered.length} of ${fullStatus}` : fullStatus);
    show(1, true);
    return (ordered || inOrder).length;
  }

  show(1, true);

  return {
    total,
    failed: !first,
    loadAll,
    items: () => all,
    missing: () => inOrder ? inOrder.length - all.length : 0,
    onProgress: listener => progressListeners.push(listener),
    onLoaded: listener => loadedListeners.push(listener),
    sort: newOrder => {
      order = newOrder;
      arrange();
    },
    filter: newKeep => {
      keep = newKeep;
      arrange();
    },
    search: newTerm => {
      term = newTerm;
      return arrange();
    },
    activate: () => { // rimostra questa lista
      _skgifPaginators[containerId] = paginator;
      status(...lastStatus);
      show(1, true);
    }
  };
}

// Grafico per anno di una lista: si carica da solo fino ad autoLoad risultati,
// con il bottone "Load chart" fino a maxLoad, oltre non è disponibile.
// onYear(anno): clic su una barra (filtro Year).
function _skgifListChart(list, { boxId, noun, owner, label, maxLoad = Infinity, autoLoad = SKGIF_CHART_AUTO_LOAD,
  after = Promise.resolve(), buttonText = 'Load chart', buttonNote = '', onYear }) {
  const box = document.getElementById(boxId);
  if (!box) return;
  if (list.failed) return void (box.innerHTML = '<em>Chart not available.</em>');
  if (!list.total) return void (box.innerHTML = `<em>No ${noun}s found.</em>`);

  let drawing = false;
  const draw = () => {
    if (drawing) return;
    drawing = true;
    box.innerHTML = `<div class="mb-2">Loading ${noun}s…</div>`;
    list.onProgress((loaded, total) => {
      box.innerHTML = `<div class="mb-2">Loading ${noun}s… ${loaded}/${total}</div>
        <div class="progress br-chart-progress" style="height: 6px; width: 100%;"><div class="progress-bar" style="width: ${Math.round(loaded / total * 100)}%"></div></div>`;
    });
    list.loadAll().then(() => {
      _skgifYearChart(box, list.items().map(_skgifProductRawDate), label, `No ${noun}s found.`, 200, onYear);
      const missing = list.missing();
      if (missing) box.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, noun)} could not be loaded</div>`);
    });
  };
  if (list.total <= autoLoad) return void after.then(draw);
  if (list.total > maxLoad) return void (box.innerHTML = '<em>Chart not available.</em>');
  box.innerHTML = `<p class="mb-3">This ${owner} has ${list.total} ${noun}s.${buttonNote ? ' ' + buttonNote : ''}</p>
    <button type="button" class="btn btn-sm br-load-chart">${buttonText}</button>`;
  box.querySelector('button').addEventListener('click', draw);
  list.onProgress(draw); // segue lo scaricamento partito da un altro bottone
}

// Menu a tendina personalizzato (al posto del <select> del browser).
function _skgifDropdown(ariaLabel, options, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'skgif-dd';
  wrap.innerHTML = `<button type="button" class="skgif-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${_skgifEscape(ariaLabel)}" disabled><span class="skgif-dd-value"></span></button><ul class="skgif-dd-menu" role="listbox"></ul>`;
  const btn = wrap.querySelector('button');
  const menu = wrap.querySelector('ul');
  let list = [];
  let value = '';
  let current = -1;

  const items = () => [...menu.children];
  const isOpen = () => wrap.classList.contains('open');
  function render() {
    menu.innerHTML = list.map(o => `<li class="skgif-dd-item${o.value === value ? ' selected' : ''}" role="option" aria-selected="${o.value === value}" data-value="${_skgifEscape(o.value)}">${_skgifEscape(o.text)}</li>`).join('');
    btn.firstChild.textContent = list.find(o => o.value === value)?.text || '';
  }
  function highlight(i) {
    const all = items();
    if (!all.length) return;
    current = (i + all.length) % all.length;
    all.forEach((li, j) => li.classList.toggle('active', j === current));
    all[current].scrollIntoView({ block: 'nearest' });
  }
  function open() {
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    highlight(Math.max(0, items().findIndex(li => li.classList.contains('selected'))));
  }
  function close() {
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function choose(li) {
    value = li.dataset.value;
    render();
    close();
    btn.focus();
    onChange(value);
  }

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  menu.addEventListener('mousedown', e => e.preventDefault());
  menu.addEventListener('click', e => {
    const li = e.target.closest('.skgif-dd-item');
    if (li) choose(li);
  });
  menu.addEventListener('mousemove', e => {
    const li = e.target.closest('.skgif-dd-item');
    if (li && !li.classList.contains('active')) highlight(items().indexOf(li));
  });
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen()) open();
      else highlight(current + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen() && current >= 0) choose(items()[current]);
      else open();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      close();
    }
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });

  const set = (newOptions, newValue = value) => {
    list = newOptions;
    value = list.some(o => o.value === newValue) ? newValue : (list[0]?.value ?? '');
    render();
  };
  set(options);
  return {
    el: wrap,
    set,
    select: newValue => set(list, newValue),
    value: () => value,
    enabled: () => !btn.disabled,
    enable: on => { btn.disabled = !on; if (!on) close(); }
  };
}

// Filtri delle liste (Type, Year, Role).
const SKGIF_FILTERS = {
  type: { label: 'Type', values: p => [_skgifProductType(p)], sort: (a, b) => a.localeCompare(b) },
  year: {
    label: 'Year',
    values: p => [/^\d{4}/.test(String(_skgifProductRawDate(p) || '')) ? String(_skgifProductRawDate(p)).slice(0, 4) : 'No date'],
    sort: (a, b) => (a === 'No date') - (b === 'No date') || b.localeCompare(a) // dal più recente, senza data in fondo
  },
  role: {
    label: 'Role', startHidden: true,
    values: p => [..._raPersonRoles(p)].filter(r => r === 'author' || r === 'editor'),
    text: r => r === 'author' ? 'As author' : 'As editor'
  }
};

// Tipo del prodotto ("journal article"...).
function _skgifProductType(product) {
  return _skgifArray(product.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || 'unknown type';
}

// Crea i menu dei filtri `keys` in box, con il numero di risultati per ogni valore.
// Un filtro con meno di 2 valori è nascosto. onChange(keep) riceve la funzione di filtro.
// select(key, value): usato dal clic sul grafico.
function _skgifListFilters(box, keys, onChange) {
  const chosen = {};
  let all = [];
  let match = null; // ricerca nel titolo attiva
  let values = {}; // valori di ogni filtro
  const passes = (product, except) => parts.every(part => part === except || !chosen[part.key]
    || part.def.values(product).includes(chosen[part.key]));
  // Aggiorna i numeri nei menu.
  const recount = () => parts.forEach(part => {
    const base = all.filter(product => (!match || match(product)) && passes(product, part));
    const counts = {};
    base.forEach(product => part.def.values(product).forEach(v => { counts[v] = (counts[v] || 0) + 1; }));
    part.dropdown.set([{ value: '', text: `All (${base.length})` },
      ...values[part.key].map(v => ({ value: v, text: `${part.def.text ? part.def.text(v) : v} (${counts[v] || 0})` }))]);
  });
  const changed = () => {
    recount();
    const any = parts.some(part => chosen[part.key]);
    clear.classList.toggle('d-none', !any);
    onChange(any ? product => passes(product, null) : null);
  };
  const parts = keys.map(key => {
    const def = SKGIF_FILTERS[key];
    const wrap = document.createElement('div');
    wrap.className = `d-flex align-items-center gap-2${def.startHidden ? ' d-none' : ''}`;
    wrap.innerHTML = `<span class="small fw-bold">${def.label}:</span>`;
    const dropdown = _skgifDropdown(`Filter by ${def.label.toLowerCase()}`, [{ value: '', text: 'All' }], value => {
      chosen[key] = value;
      changed();
    });
    wrap.appendChild(dropdown.el);
    box?.appendChild(wrap);
    return { key, def, wrap, dropdown };
  });
  // Bottone "Clear filters": riporta tutti i filtri su All.
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'btn btn-sm skgif-clear-filters d-none';
  clear.textContent = 'Clear filters';
  clear.addEventListener('click', () => {
    parts.forEach(part => {
      chosen[part.key] = '';
      part.dropdown.select('');
    });
    changed();
  });
  box?.appendChild(clear);
  return {
    fill(items) {
      all = items;
      parts.forEach(({ key, def, wrap, dropdown }) => {
        values[key] = [...new Set(items.flatMap(def.values))].sort(def.sort);
        wrap.classList.toggle('d-none', values[key].length < 2);
        dropdown.enable(true);
      });
      recount();
    },
    // La ricerca nel titolo cambia i numeri.
    setMatch(newMatch) {
      match = newMatch;
      if (all.length) recount();
    },
    select(key, value) {
      const part = parts.find(p => p.key === key);
      if (!part || !part.dropdown.enabled() || !part.wrap.offsetParent) return false;
      chosen[key] = part.dropdown.value() === value ? '' : value;
      part.dropdown.select(chosen[key]);
      changed();
      return true;
    }
  };
}

// Menu "Per page" (10, 20, 50, 100), nascosto se basta una pagina.
const SKGIF_PER_PAGE = [10, 20, 50, 100];
function _skgifInitPerPage(prefix, list) {
  const box = document.getElementById(`${prefix}-perpage`);
  if (!box || list.failed || list.total <= SKGIF_DEFAULT_PAGE_SIZE) return;
  const containerId = `${prefix}-list`;
  const dropdown = _skgifDropdown('Results per page', SKGIF_PER_PAGE.map(n => ({ value: String(n), text: String(n) })), value => {
    _skgifPageSizes[containerId] = Number(value);
    _skgifPaginators[containerId]?.refresh?.(); // torna alla pagina 1
  });
  box.appendChild(dropdown.el);
  dropdown.enable(true);
  box.classList.remove('d-none');
}

// Mostra "Per page" solo se c'è più di una pagina.
function _skgifTogglePerPage(prefix, count) {
  const box = document.getElementById(`${prefix}-perpage`);
  if (box?.querySelector('.skgif-dd')) box.classList.toggle('d-none', count <= SKGIF_DEFAULT_PAGE_SIZE);
}

// Barra degli strumenti di una lista sfogliabile: filtri, Sort by, Per page,
// Search in titles, bottone "Load all". Filtri e Sort by servono tutti i risultati:
// disattivati finché non sono arrivati, nascosti se non servono.
function _skgifListTools({ prefix, list, source, autoLoad, maxLoad, noun, search }) {
  const tools = document.getElementById(`${prefix}-tools`);
  const load = document.getElementById(`${prefix}-load`);
  const bar = document.getElementById(`${prefix}-progress`);
  const loadable = !list.failed && list.total > 1 && list.total <= maxLoad;
  const state = { started: list.total <= autoLoad, loaded: false, searching: false, arrived: 0 }; // scaricamento partito
  const update = () => {
    const loading = loadable && state.started && !state.loaded && !state.searching;
    tools?.classList.toggle('d-none', !loadable || !state.started || state.searching);
    load?.classList.toggle('d-none', !loadable || state.started || state.searching);
    bar?.classList.toggle('d-none', !loading);
    const text = state.searching ? '' : loading ? `Loading ${noun}s… ${state.arrived}/${list.total}`
      : loadable && !state.started ? 'Load them all to filter and sort the list.'
      : !list.failed && list.total > maxLoad ? 'Filters and sorting are not available.' : '';
    _skgifSetNote(`${prefix}-note`, text);
  };
  const filters = _skgifListFilters(tools?.querySelector('.skgif-filters'), ['type', 'year'], keep => list.filter(keep));
  const sortButtons = tools ? [...tools.querySelectorAll('.ra-sort button')] : [];
  sortButtons.forEach(button => button.addEventListener('click', () => {
    sortButtons.forEach(b => b.classList.toggle('active', b === button));
    list.sort(button.dataset.order);
  }));
  list.onProgress((loaded, total) => {
    state.started = true;
    state.arrived = loaded;
    update();
    bar?.querySelector('.progress-bar')?.style.setProperty('width', `${Math.round(loaded / total * 100)}%`);
  });
  load?.addEventListener('click', () => list.loadAll());
  update();
  if (loadable) list.onLoaded(() => {
    state.loaded = true;
    update();
    filters.fill(list.items());
    sortButtons.forEach(button => { button.disabled = false; });
  });
  _skgifInitPerPage(prefix, list);
  _skgifListSearch(prefix, source, list, search, filters, searching => {
    state.searching = searching;
    update();
  });
  return filters;
}

// "Search in titles" di una lista sfogliabile: se la lista è tutta scaricata cerca
// tra i risultati (senza chiamate), altrimenti chiede all'API (cf.search.title).
// "Clear search" o ricerca vuota rimostrano la lista completa.
function _skgifListSearch(prefix, source, list, { noun, statusNoun, scrollId, renderCard }, filters, onSearching) {
  const form = document.getElementById(`${prefix}-search`);
  const input = document.getElementById(`${prefix}-search-input`);
  const reset = document.getElementById(`${prefix}-search-reset`);
  if (!form || !input || !reset) return;
  if (list.failed || list.total < 2) return void form.classList.add('d-none'); // con 0-1 risultati non c'è niente da cercare
  // attivato solo quando la lista è pronta
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  let current = ''; // ignora le risposte di ricerche vecchie
  let local = false;
  const showAll = () => {
    current = '';
    input.value = '';
    reset.classList.add('d-none');
    onSearching(false);
    if (local) list.search('');
    else list.activate();
    filters.setMatch(null);
    local = false;
  };
  reset.addEventListener('click', showAll);
  input.addEventListener('input', () => { // testo cancellato: torna la lista di prima
    if (!input.value.trim() && !reset.classList.contains('d-none')) showAll();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    _skgifKeepCursor(input);
    const term = _skgifSafeTerm(input.value);
    if (!term) return showAll();
    current = term;
    reset.classList.remove('d-none');
    if (list.items()) { // lista tutta scaricata: ricerca locale
      if (!local) list.activate();
      local = true;
      onSearching(false);
      filters.setMatch(product => _raTitleHas(product, term));
      list.search(term);
      return;
    }
    if (local) {
      list.search('');
      filters.setMatch(null);
    }
    local = false;
    onSearching(true);
    delete _skgifPaginators[`${prefix}-list`];
    _skgifListStatus(`${prefix}-status`, `${prefix}-progress`, 'Searching…', null);
    _skgifHoldHeight(document.getElementById(`${prefix}-list`));
    _skgifSetField(`${prefix}-list`, SKGIF_LOADING_HTML);
    const searchSource = `${source},cf.search.title:${encodeURIComponent(term)}`;
    skgifFirstPage(searchSource, SKGIF_LIST_PAGE_SIZE).then(first => {
      if (current !== term) return;
      _skgifPagedList({
        prefix, source: searchSource, first, noun, scrollId, renderCard,
        showTotal: false, // il totale resta quello della lista completa
        emptyMessage: '',
        statusText: n => `${_skgifPlural(n, statusNoun)} with “${term}” in the title`
      });
    });
  });
}

// Dopo una ricerca il cursore resta nel campo, dopo l'ultima lettera (anche cliccando "Search"):
// per tornare alla lista completa basta cancellare il testo.
function _skgifKeepCursor(input) {
  input.focus({ preventScroll: true });
  input.setSelectionRange(input.value.length, input.value.length);
}

// Tempo massimo di attesa per pagina: se scade, i risultati vengono richiesti in pagine più piccole.
const SKGIF_PAGE_TIMEOUT = 35000;
const SKGIF_SMALL_PAGE_TIMEOUT = 15000;
const SKGIF_ITEM_TIMEOUT = 10000;
const _skgifTimeout = size => size === 1 ? SKGIF_ITEM_TIMEOUT : size <= SKGIF_DEFAULT_PAGE_SIZE ? SKGIF_SMALL_PAGE_TIMEOUT : SKGIF_PAGE_TIMEOUT;

// Chiede `count` risultati di una lista a partire da `start`, in una pagina di `size`.
// Se non arriva in tempo li richiede in pagine da 10 e poi uno alla volta; un risultato
// che non arriva neanche da solo diventa { _skgifMissing: true }.
function skgifFetchRange(source, start, count, size, timeoutMs = _skgifTimeout(size)) {
  return skgifFetch(`${source}&page=${start / size + 1}&page_size=${size}`, timeoutMs)
    .then(data => data ? (data['@graph'] || []) : skgifSplitRange(source, start, count, size));
}

function skgifSplitRange(source, start, count, size, retried = false) {
  if (size === 1) { // un solo risultato: riprovato una volta, poi segnato come mancante
    if (retried) return Promise.resolve([{ _skgifMissing: true }]);
    return skgifFetch(`${source}&page=${start + 1}&page_size=1`, SKGIF_ITEM_TIMEOUT)
      .then(data => data ? (data['@graph'] || []) : skgifSplitRange(source, start, count, size, true));
  }
  const smaller = size > SKGIF_DEFAULT_PAGE_SIZE ? SKGIF_DEFAULT_PAGE_SIZE : 1;
  const parts = [];
  for (let from = 0; from < count; from += smaller) {
    parts.push(skgifFetchRange(source, start + from, Math.min(smaller, count - from), smaller));
  }
  return Promise.all(parts).then(lists => lists.flat());
}

// Prima pagina di una lista: { total, items }; null se non si legge neanche il totale.
function skgifFirstPage(source, size) {
  return skgifFetch(`${source}&page=1&page_size=${size}`, _skgifTimeout(size)).then(data => {
    if (data) return { total: skgifTotal(data), items: data['@graph'] || [] };
    return skgifFetch(`${source}&page=1&page_size=1`, SKGIF_ITEM_TIMEOUT).then(one => {
      if (!one) return null;
      const total = skgifTotal(one);
      return skgifSplitRange(source, 0, Math.min(size, total), size).then(items => ({ total, items }));
    });
  });
}

// Card al posto di un risultato che l'API non ha restituito.
function _skgifMissingCard(noun) {
  return `<div class="col-12 mb-2"><div class="card shadow-sm"><div class="card-body text-muted">1 ${noun} could not be loaded</div></div></div>`;
}

const _skgifPaginators = {};

/*
Opzioni di createSkgifPaginatedSearch():
  sources        - URL di ricerca SKG-IF senza page/page_size; più fonti vengono
                   mostrate come un'unica lista, una dopo l'altra
  renderItem     - funzione che crea l'HTML di una card
  rankItems      - (facoltativa) riordina i risultati di una pagina
  emptyMessage   - (facoltativo) testo se non ci sono risultati
  pageSize       - (facoltativo) risultati per pagina
  containerId    - (facoltativo) dove mettere le card
  totalCountId   - (facoltativo) dove scrivere il totale
  dedupeKey      - (facoltativa) chiave per togliere i doppioni
  missingNoun    - (facoltativo) se c'è, le pagine che non arrivano vengono
                   richieste in pezzi più piccoli (liste di citazioni/riferimenti)
*/
function createSkgifPaginatedSearch(config) { // Gestisce la paginazione
  const containerId = config.containerId || 'search-results-container';
  const totalCountId = config.totalCountId || 'search-total-count';
  const dedupeKey = config.dedupeKey || (item => item.local_identifier || JSON.stringify(item));
  const pageSize = config.pageSize || SKGIF_DEFAULT_PAGE_SIZE;
  const sources = config.sources || [];
  let sourceTotals = null; // totale di ogni fonte
  let listedTotal = 0; // somma dei totali delle fonti
  let firstItems = []; // prima pagina di ogni fonte

  const pageUrl = (src, apiPage) => `${src}&page=${apiPage}&page_size=${pageSize}`; // URL di una pagina

  // Scarica più pagine; se una fallisce dà errore (così non sembra una pagina vuota).
  const fetchAll = urls => Promise.all(urls.map(skgifFetch)).then(responses => {
    if (responses.some(r => !r)) throw new Error(SKGIF_FAILED_MESSAGE);
    return responses;
  });

  // Scrive il totale nel titolo e mostra la pagina.
  function showCount() {
    _skgifFallbackCount(totalCountId, listedTotal);
    releaseSkgifPage();
  }

  // Legge il totale di ogni fonte dalla sua prima pagina.
  function loadTotals() {
    if (sourceTotals) return Promise.resolve();
    if (config.missingNoun) {
      return Promise.all(sources.map(src => skgifFirstPage(src, pageSize))).then(firsts => {
        if (firsts.some(f => !f)) throw new Error(`The ${config.missingNoun}s could not be loaded (the API did not answer).`);
        firstItems = firsts.map(f => f.items);
        sourceTotals = firsts.map(f => f.total);
        listedTotal = sourceTotals.reduce((a, b) => a + b, 0);
      });
    }
    return fetchAll(sources.map(src => pageUrl(src, 1))).then(responses => {
      sourceTotals = responses.map(skgifTotal);
      listedTotal = sourceTotals.reduce((a, b) => a + b, 0);
    });
  }

  // Calcola quali risultati mostrare nella pagina, anche a cavallo tra due fonti.
  function itemsForPage(page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const parts = [];
    let offset = 0;
    sources.forEach((src, i) => {
      const total = sourceTotals[i];
      const from = Math.max(start, offset) - offset;
      const to = Math.min(end, offset + total) - offset;
      offset += total;
      if (from >= to) return;
      const firstApiPage = Math.floor(from / pageSize) + 1;
      const lastApiPage = Math.floor((to - 1) / pageSize) + 1;
      const urls = [];
      for (let p = firstApiPage; p <= lastApiPage; p++) urls.push(pageUrl(src, p));
      const pages = config.missingNoun
        ? Promise.all(urls.map((url, k) => {
            const p = firstApiPage + k;
            return p === 1 ? firstItems[i] : skgifFetchRange(src, (p - 1) * pageSize, Math.min(pageSize, total - (p - 1) * pageSize), pageSize);
          })).then(lists => lists.flat())
        : fetchAll(urls).then(responses => responses.flatMap(r => _skgifArray(r["@graph"])));
      parts.push(pages.then(items => {
        const skip = from - (firstApiPage - 1) * pageSize;
        return items.slice(skip, skip + (to - from)); 
      }));
    });
    return Promise.all(parts).then(lists => lists.flat());
  }

  function fetchPage(page) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = SKGIF_LOADING_HTML;
    }

    loadTotals()
      .then(() => itemsForPage(page))
      .then(pageItems => {
        const seen = new Set();
        const items = pageItems.filter(item => {
          if (item._skgifMissing) return true; // risultato mancante: non è un doppione
          const key = dedupeKey(item); // toglie i doppioni della pagina
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const ranked = config.rankItems ? config.rankItems(items) : items;
        _render(container, ranked, page, listedTotal);
        showCount();
        // Precarica la pagina successiva, così Next è più veloce.
        if (page * pageSize < listedTotal) itemsForPage(page + 1).catch(() => {});
      })
      .catch(error => {
        console.error("SKG-IF search failed:", error);
        if (container) container.innerHTML = `<div class="col-12"><div class="alert alert-danger">${_skgifEscape(error.message)}</div></div>`;
        releaseSkgifPage(); // la ricerca non è riuscita
      });
  }

  function _render(container, items, page, totalItems) { // numero di pagine
    if (!container) return;

    if (items.length === 0) {
      _skgifShowMessage(config.emptyMessage || 'No results found.', containerId);
      return;
    }

    // Il contenitore è già una .row: le card vanno messe direttamente.
    let html = items.map(item => item._skgifMissing ? _skgifMissingCard(config.missingNoun) : config.renderItem(item)).join('');

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    html += _skgifPaginationBar(containerId, page, totalPages);

    container.innerHTML = html; // card + barra di paginazione

  }

  // Cambiando pagina si torna all'inizio dei risultati.
  function goToPage(page) {
    const countEl = document.getElementById(totalCountId);
    const target = (countEl && countEl.closest('.card')) || document.getElementById(containerId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    fetchPage(page);
  }

  _skgifPaginators[containerId] = { goToPage };
  // La ricerca tiene il banner "Loading" finché non arrivano totale e primi risultati.
  return {
    search: () => {
      holdSkgifPage();
      fetchPage(1);
    }
  };
}

// Barra di paginazione sotto una lista (First/Previous, "Page N of M", Next/Last).
function _skgifPaginationBar(containerId, page, totalPages) {
  const btn = (target, label, cls) =>
    `<button type="button" class="btn ${cls} skgif-page-btn" data-skgif-page="${target}" data-skgif-container="${containerId}">${label}</button>`;
  const prevBtns = page > 1
    ? `<span class="skgif-page-group">${btn(1, '&laquo; First', 'btn-outline-secondary')}${btn(page - 1, '&lsaquo; Previous', 'btn-outline-secondary')}</span>`
    : `<span></span>`;
  const nextBtns = page < totalPages
    ? `<span class="skgif-page-group">${btn(page + 1, 'Next &rsaquo;', 'btn-outline-primary')}${btn(totalPages, 'Last &raquo;', 'btn-outline-primary')}</span>`
    : `<span></span>`;
  // Numero di pagina + Invio: va a quella pagina.
  const pageInput = totalPages > 1
    ? `<input type="number" class="form-control form-control-sm skgif-page-input" min="1" max="${totalPages}" value="${page}" aria-label="Go to page" data-skgif-container="${containerId}">`
    : `${page}`;
  return `
    <div class="col-12">
      <nav class="skgif-pagination" aria-label="Search results pages">
        ${prevBtns}
        <span class="skgif-page-info">Page ${pageInput} of ${totalPages}</span>
        ${nextBtns}
      </nav>
    </div>`;
}

// Gestori dei clic e dell'Invio della barra di paginazione, comuni a tutte le liste.
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.skgif-page-btn');
  if (!btn || btn.disabled) return;
  const paginator = _skgifPaginators[btn.dataset.skgifContainer];
  const page = parseInt(btn.dataset.skgifPage, 10);
  if (paginator && page >= 1) paginator.goToPage(page);
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const input = e.target.closest('.skgif-page-input');
  if (!input) return;
  const paginator = _skgifPaginators[input.dataset.skgifContainer];
  const max = parseInt(input.max, 10);
  const page = parseInt(input.value, 10);
  if (!paginator || isNaN(page)) return;
  paginator.goToPage(Math.min(Math.max(page, 1), max));
});

/*
################################################################################
# 2. UTILITÀ COMUNI (query, testo, identificativi, card)
################################################################################
*/
// Valore di un parametro dell'URL della pagina (search_query, id...), decodificato.
function _skgifUrlParam(lucinda_main_data, key) {
  let value = (lucinda_main_data || {})[key] || "";
  value = String(Array.isArray(value) ? value[0] : value);
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

// Messaggio al posto dei risultati (es. ricerca vuota).
function _skgifShowMessage(text, containerId = 'search-results-container') {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = `<div class="col-12"><p>${text}</p></div>`;
}

// Un campo dell'API che dovrebbe essere una lista: [] se manca.
function _skgifArray(value) {
  return Array.isArray(value) ? value : [];
}

// "1 publication", "2 publications".
function _skgifPlural(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

// Rende sicuro un testo scritto dall'utente per un filtro cf.search.*:
// i caratteri che rompono la richiesta (, " ' \ * & # %) diventano spazi.
function _skgifSafeTerm(s) {
  return String(s || "").normalize('NFC')
    .replace(/[,"'\\*&#%]/g, ' ') //caratteri che rompono la richiesta
    .split(/\s+/).filter(Boolean).join(' ');
}

// Ricerca per identificativo (pannello ID della home): {scheme, id}, null se è una ricerca libera.
function _skgifIdQuery(query) {
  if (!query.startsWith('scheme=')) return null;
  const params = new URLSearchParams(query);
  return { scheme: (params.get('scheme') || "").toLowerCase(), id: (params.get('id') || "").trim() };
}

// Campo del filtro con il valore dell'ID: identifiers.id, per le riviste identifiers.value.
const SKGIF_ID_FIELD = { products: 'identifiers.id', persons: 'identifiers.id', organisations: 'identifiers.id', venues: 'identifiers.value' };

// Cosa chiede all'API una pagina di ricerca, a partire da search_query:
// { label, source } = URL di ricerca ("" = niente da cercare), oppure
// { label, omidUrl } per la ricerca per OMID. Usata sia dal #preprocess sia dal #callfun,
// così la prima pagina viene chiesta una sola volta.
function _skgifSearchPlan(entity, query) {
  const idQuery = _skgifIdQuery(query);
  if (idQuery) {
    const { scheme, id } = idQuery;
    const label = `${scheme}: ${id}`;
    if (!scheme || !id) return { label, source: '' };
    if (scheme === 'omid') {
      const shortOmid = id.replace(/^omid:/i, '').replace(/^https?:\/\/w3id\.org\/oc\/meta\//i, '');
      return { label, omidUrl: `${SKGIF_API}/${entity}/https://w3id.org/oc/meta/${shortOmid}` };
    }
    return { label, source: `${SKGIF_API}/${entity}?filter=identifiers.scheme:${encodeURIComponent(scheme)},${SKGIF_ID_FIELD[entity]}:${encodeURIComponent(id)}` };
  }
  const apiTerm = s => encodeURIComponent(_skgifSafeTerm(s));
  if (entity === 'persons') {
    const fields = _authorSearchFields(query);
    const label = [fields.given && `Given name: ${fields.given}`, fields.family && `Family name: ${fields.family}`].filter(Boolean).join(' · ');
    const filters = [];
    if (fields.given) filters.push(`cf.search.given_name:${apiTerm(fields.given)}`);
    if (fields.family) filters.push(`cf.search.family_name:${apiTerm(fields.family)}`);
    return { label, fields, source: filters.length ? `${SKGIF_API}/persons?filter=${filters.join(',')}` : '' }; // virgola = AND
  }
  const term = _skgifSafeTerm(query);
  const field = entity === 'products' ? 'cf.search.title' : 'cf.search.name';
  return { label: term, source: term ? `${SKGIF_API}/${entity}?filter=${field}:${encodeURIComponent(term)}` : '' };
}

// #preprocess di Lucinda per le ricerche: search_url ("" = nessuna chiamata) e search_label.
function pre_skgif_search(entity, searchQuery) {
  let query = String(searchQuery || '');
  try { query = decodeURIComponent(query); } catch (e) { /* keep as is */ }
  const plan = _skgifSearchPlan(entity, query);
  const url = plan.omidUrl || (plan.source ? `${plan.source}&page=1&page_size=${SKGIF_DEFAULT_PAGE_SIZE}` : '');
  return { search_url: url, search_label: plan.label };
}

// #postprocess di Lucinda per le ricerche: [totale, etichetta] per il titolo ("–" se fallita).
function post_skgif_search(res, searchUrl, searchLabel) {
  let total;
  if (!searchUrl) total = 0;
  else if (!searchUrl.includes('?')) total = res.ok && (res.json?.['@graph'] || [])[0]?.local_identifier ? 1 : (res.ok || res.status === 404 ? 0 : '–'); // ricerca per OMID: il record stesso
  else total = post_skgif_total(res)[1][0];
  return [['total', 'label'], [String(total), searchLabel]];
}

// Esegue la ricerca di una pagina (#callfun): crea le card pagina per pagina.
function _skgifRunSearch(plan, renderItem, rankItems) {
  if (plan.omidUrl) return _skgifShowByOmid(plan.omidUrl, renderItem);
  if (!plan.source) return _skgifShowMessage('No results found.');
  createSkgifPaginatedSearch({ sources: [plan.source], rankItems, renderItem }).search();
}

// Ricerca per OMID: un solo record, mostrato senza paginazione (404 = non trovato).
function _skgifShowByOmid(url, renderItem) {
  const container = document.getElementById('search-results-container');
  holdSkgifPage();
  skgifFetch(url)
    .then(data => {
      if (!data) return _skgifShowMessage(SKGIF_FAILED_MESSAGE);
      const record = (data['@graph'] || [])[0];
      if (record) container.innerHTML = renderItem(record);
      else _skgifShowMessage('No results found.');
    })
    .finally(releaseSkgifPage);
}

// Protegge il testo dell'API prima di metterlo nell'HTML.
function _skgifEscape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// OMID corto ("br/06011277533") dall'URL completo; "" se manca.
function _skgifOmid(localId) {
  const match = String(localId || "").match(/\/meta\/([a-z]{2}\/[\w\d]+)$/);
  return match ? match[1] : "";
}

// Indirizzo della pagina esterna di ogni tipo di identificativo.
// Una funzione che restituisce "" = nessun link.
const _skgifUrlPart = v => encodeURI(v).replace(/[?#]/g, encodeURIComponent);
const _skgifHttpUrl = v => /^https?:\/\//i.test(v) ? encodeURI(v) : "";
const SKGIF_ID_URLS = {
  doi: v => `https://doi.org/${_skgifUrlPart(v)}`,
  pmid: v => `https://pubmed.ncbi.nlm.nih.gov/${_skgifUrlPart(v)}/`,
  issn: v => `https://portal.issn.org/resource/ISSN/${_skgifUrlPart(v)}`,
  openalex: v => `https://openalex.org/${_skgifUrlPart(v)}`,
  orcid: v => `https://orcid.org/${_skgifUrlPart(v)}`,
  omid: v => `https://w3id.org/oc/meta/${_skgifUrlPart(v)}`,
  pmcid: v => `https://pmc.ncbi.nlm.nih.gov/articles/${_skgifUrlPart(v)}/`,
  arxiv: v => `https://arxiv.org/abs/${_skgifUrlPart(v)}`,
  crossref: v => `https://www.crossref.org/members/prep/${_skgifUrlPart(v)}`,
  ror: v => `https://ror.org/${_skgifUrlPart(v)}`,
  viaf: v => `https://viaf.org/viaf/${_skgifUrlPart(v)}`,
  handle: v => `https://hdl.handle.net/${_skgifUrlPart(v)}`,
  bibcode: v => `https://ui.adsabs.harvard.edu/abs/${_skgifUrlPart(v)}`,
  isbn: v => `https://search.worldcat.org/isbn/${_skgifUrlPart(v)}`,
  eissn: v => `https://portal.issn.org/resource/ISSN/${_skgifUrlPart(v)}`,
  lissn: v => `https://portal.issn.org/resource/ISSN-L/${_skgifUrlPart(v)}`,
  jid: v => `https://www.jstage.jst.go.jp/browse/${_skgifUrlPart(v)}`,
  ivoid: v => `https://dc.g-vo.org/I/${_skgifUrlPart(v)}`,
  spase: v => /^spase:\/\//i.test(v) ? `https://spase-metadata.org/${_skgifUrlPart(v.replace(/^spase:\/\//i, ''))}` : "",
  urn: v => /^urn:nbn:/i.test(v) ? `https://nbn-resolving.org/${_skgifUrlPart(v)}` : "",
  url: _skgifHttpUrl,
  w3id: v => _skgifHttpUrl(v) || `https://w3id.org/${_skgifUrlPart(v.replace(/^\/+/, ''))}`,
  opendoar: v => `https://v2.sherpa.ac.uk/id/repository/${_skgifUrlPart(v)}`
};

// Ordine in cui mostrare gli identificativi (omid in fondo).
const SKGIF_ID_ORDER = ['doi', 'pmid', 'pmcid', 'arxiv', 'isbn', 'issn', 'openalex'];

function _skgifIdRank(scheme) {
  if (scheme === 'omid') return SKGIF_ID_ORDER.length + 1;
  const i = SKGIF_ID_ORDER.indexOf(scheme);
  return i === -1 ? SKGIF_ID_ORDER.length : i;
}

// "schema:valore", con link alla pagina esterna se c'è.
function _skgifIdLink(scheme, value) {
  const s = String(scheme || "").toLowerCase();
  const label = _skgifEscape(`${s}:${value}`);
  const url = SKGIF_ID_URLS[s] ? SKGIF_ID_URLS[s](String(value)) : "";
  return url
    ? `<a href="${_skgifEscape(url)}" target="_blank" class="text-dark text-decoration-none">${label}</a>` // link esterni in una nuova scheda, quelli interni nella stessa
    : label;
}

// Riga degli identificativi ("doi:... • omid:br/..."); asBadges = come badge.
function _skgifIdList(identifiers, omid, asBadges = false) {
  const ids = _skgifArray(identifiers)
    .filter(i => i && i.scheme && i.value)
    .map(i => ({ scheme: String(i.scheme).toLowerCase(), value: i.value }));
  if (omid) ids.push({ scheme: 'omid', value: omid });
  return ids
    .map((id, i) => ({ id, i }))
    .sort((a, b) => _skgifIdRank(a.id.scheme) - _skgifIdRank(b.id.scheme) || a.i - b.i)
    .map(x => _skgifIdLink(x.id.scheme, x.id.value))
    .map(link => asBadges ? `<span class="badge ra-id-badge">${link}</span>` : link)
    .join(asBadges ? ' ' : ' • ');
}

// Persone/organizzazioni di un prodotto con un certo ruolo (author, editor, publisher), in ordine.
function _skgifContributors(contributions, role) {
  return _skgifArray(contributions)
    .filter(c => c && c.role === role && c.by)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(c => c.by);
}

// Nome come "Cognome, Nome" (o nome dell'organizzazione), protetto per l'HTML.
function _skgifAgentName(by) {
  return _skgifEscape(_skgifAgentPlainName(by));
}

// Lo stesso nome, non protetto (dati per un #postprocess).
function _skgifAgentPlainName(by) {
  return (by.name || '').trim() || [by.family_name, by.given_name].filter(Boolean).join(', ') || 'Unknown Name';
}

// Link alla scheda di una persona/organizzazione: browser.html?value=ra/<id>.
const _skgifAgentUrl = agentOmid => `browser.html?value=${agentOmid}`;

// Nomi con un certo ruolo, separati da " • ", con link alla loro scheda
// (e ORCID tra parentesi se withOrcid). "" se non ce ne sono.
function _skgifAgents(contributions, role, agentUrl = _skgifAgentUrl, withOrcid = true) {
  return _skgifContributors(contributions, role)
    .map(by => {
      const name = _skgifAgentName(by);
      const agentOmid = _skgifOmid(by.local_identifier);
      const orcid = withOrcid ? _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value : null;
      let html = agentOmid
        ? `<a href="${agentUrl(agentOmid)}" class="text-dark text-decoration-none">${name}</a>`
        : `<span>${name}</span>`;
      if (orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(orcid)}" target="_blank">${_skgifEscape(orcid)}</a>)</span>`; // parentesi e ORCID sulla stessa riga
      return html;
    })
    .join(' • ');
}

// Pagine "prima-ultima" (una sola se uguali), "" se mancano.
function _skgifPageRange(biblio, dash) {
  const pages = (biblio || {}).pages || {};
  return pages.first && pages.last && pages.first !== pages.last ? `${pages.first}${dash}${pages.last}` : (pages.first || pages.last || '');
}

// Autori di un prodotto; se non ce ne sono, gli editor ("Editors"); altrimenti "Unknown".
function _skgifAuthorsOrEditors(contributions) {
  const authors = _skgifAgents(contributions, 'author');
  const editors = authors ? "" : _skgifAgents(contributions, 'editor');
  return { label: editors ? 'Editors' : 'Authors', html: authors || editors || 'Unknown' };
}

// --- VIEW FUNCTIONS ---
// Creano l'HTML dei segnaposto [[Lucinda:...]] dei template, a partire dalle
// tabelle dei #postprocess. Ogni argomento è una colonna di una tabella.
function _lvCell(arg) {
  return Lucinda_util.lucinda_unformat(arg).getData()[0]?.[0];
}

// Testo semplice, protetto.
Lucinda_view.prototype.skgif_text = function (...args) {
  return _skgifEscape(_lvCell(args[0]) ?? '');
};

// Intestazione del documento (titolo, riga autori/anno/rivista, ID).
Lucinda_view.prototype.skgif_head = function (...args) {
  const [title, line, meta, omid] = args.map(_lvCell);
  return _skgifHeaderHtml(title || omid, line, meta);
};

// Titolo con link alla scheda documento.
Lucinda_view.prototype.skgif_doc_link = function (...args) {
  const [omid, title] = args.map(_lvCell);
  return `<a href="browser.html?value=${_skgifEscape(omid)}">${_skgifEscape(title)}</a>`;
};

// Nomi con link alla loro scheda, ORCID tra parentesi.
Lucinda_view.prototype.skgif_agents = function (...args) {
  return _skgifArray(_lvCell(args[0])).map(agent => {
    let html = agent.omid
      ? `<a href="${_skgifAgentUrl(agent.omid)}" class="text-dark text-decoration-none">${_skgifEscape(agent.name)}</a>`
      : `<span>${_skgifEscape(agent.name)}</span>`;
    if (agent.orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(agent.orcid)}" target="_blank">${_skgifEscape(agent.orcid)}</a>)</span>`;
    return html;
  }).join(' • ');
};

// Rivista (con link) e i suoi identificativi.
Lucinda_view.prototype.skgif_source = function (...args) {
  const venue = _lvCell(args[0]);
  return venue ? _skgifSourceHtml(venue.name, venue.omid, venue.identifiers) : '';
};

// Identificativi con link, DOI per primo.
Lucinda_view.prototype.skgif_ids = function (...args) {
  return _skgifIdList(_lvCell(args[0]), args[1] ? _lvCell(args[1]) : undefined);
};

// ORCID con link a orcid.org.
Lucinda_view.prototype.skgif_orcid = function (...args) {
  const orcid = _skgifEscape(_lvCell(args[0]) ?? '');
  return `<a href="https://orcid.org/${orcid}" target="_blank">${orcid} <sup><i class="fas fa-external-link-alt small"></i></sup></a>`;
};

// OMID completo con link.
Lucinda_view.prototype.skgif_uri = function (...args) {
  const uri = `https://w3id.org/oc/meta/${_skgifEscape(_lvCell(args[0]) ?? '')}`;
  return `<a href="${uri}" target="_blank">${uri}</a>`;
};

// "ci/<oci>" preso dall'URL della pagina.
Lucinda_view.prototype.skgif_oci = function (...args) {
  let oci = String(_lvCell(args[0]) ?? '');
  try { oci = decodeURIComponent(oci); } catch (e) { /* keep as is */ }
  return `ci/${_skgifEscape(oci.trim().replace(/^oci:/i, ''))}`;
};

// --- Prodotti: titolo, data, rivista ---

// Titolo di un prodotto (quello senza lingua, altrimenti il primo).
function _skgifProductTitle(product) {
  return _skgifProductRawTitle(product) || 'No title';
}

// Lo stesso titolo, '' se manca.
function _skgifProductRawTitle(product) {
  const titles = product.titles || {};
  return (titles.none || Object.values(titles)[0] || [])[0] || '';
}

// Data di pubblicazione (solo la parte della data), protetta.
function _skgifProductDate(product) {
  const pubDate = _skgifProductRawDate(product);
  return pubDate ? _skgifEscape(String(pubDate).slice(0, 10)) : 'Unknown';
}

// Data di pubblicazione come la dà l'API; undefined se manca.
function _skgifProductRawDate(product) {
  const manifestations = _skgifArray(product.manifestations);
  return manifestations.map(m => m?.dates?.publication?.[0]).find(Boolean);
}

// Rivista del prodotto (corsivo, con link) e i suoi ID tra parentesi; "" se manca.
function _skgifProductSource(product) {
  const venue = _skgifProductVenue(product);
  return venue ? _skgifSourceHtml(venue.name, _skgifOmid(venue.local_identifier), venue.identifiers) : "";
}

// La rivista del prodotto, o undefined.
function _skgifProductVenue(product) {
  return _skgifArray(product.manifestations).map(m => m?.biblio?.in).find(v => v && v.name);
}

// HTML della rivista a partire dai suoi dati.
function _skgifSourceHtml(name, venueOmid, identifiers) {
  const venueTitle = `<i>${_skgifEscape(name)}</i>`;
  const titleHtml = venueOmid
    ? `<a href="browser.html?value=${venueOmid}" class="text-dark text-decoration-none">${venueTitle}</a>`
    : venueTitle;
  const venueIds = _skgifIdList(identifiers);
  return venueIds ? `${titleHtml} (${venueIds})` : titleHtml;
}

// --- Card e liste comuni a più pagine ---

// Card compatta di un'opera (profilo autore, scheda organizzazione, liste del documento):
// titolo con anno, autori (la persona del profilo in grassetto), rivista, ID, References/Citations.
// badgeOf(ruoli) aggiunge un'etichetta col ruolo (es. "Editor").
function _skgifWorkCard(product, badgeOf = _raEditorBadge) {
  const omid = _skgifOmid(product.local_identifier);
  if (!omid) return '';
  const year = String(_skgifProductRawDate(product) || '').slice(0, 4);
  const contributions = _skgifArray(product.contributions);
  const role = contributions.some(c => c && c.role === 'author' && c.by) ? 'author' : 'editor';
  const names = _skgifContributors(contributions, role).map(by => {
    const name = _skgifAgentName(by);
    const agentOmid = _skgifOmid(by.local_identifier);
    const html = agentOmid ? `<a href="${_skgifAgentUrl(agentOmid)}">${name}</a>` : name;
    return by.local_identifier === _raPersonOmid ? `<strong>${html}</strong>` : html; // la persona del profilo in grassetto
  });
  const namesHtml = names.length ? names.join(' • ') : 'Unknown';
  const source = _skgifProductSource(product);
  const ids = _skgifIdList(product.identifiers, omid, true);
  const roleBadge = badgeOf(_raPersonRoles(product));

  return `
    <div class="col-12 mb-2">
      <div class="card shadow-sm ra-work">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-1">
            <h5 class="ra-work-title"><a href="browser.html?value=${omid}">${_skgifEscape(_skgifProductTitle(product))}</a></h5>
            <div class="d-flex gap-1 flex-shrink-0">
              ${roleBadge ? `<span class="badge ra-role-badge">${roleBadge}</span>` : ''}
              ${year ? `<span class="badge ra-year-badge">${_skgifEscape(year)}</span>` : ''}
            </div>
          </div>
          <div class="ra-work-line"><span class="fw-bold">${role === 'author' || !names.length ? 'Authors' : 'Editors'}:</span> ${namesHtml}</div>
          ${source ? `<div class="ra-work-line"><span class="fw-bold">Source:</span> ${source}</div>` : ''}
          ${ids ? `<div class="ra-work-line"><span class="fw-bold">IDs:</span> ${ids}</div>` : ''}
          <div class="d-flex justify-content-end gap-3 ra-work-links">
            <a href="browser.html?value=doc_ref/${omid}" class="btn btn-sm">Go to References</a>
            <a href="browser.html?value=doc_cit/${omid}" class="btn btn-sm">Go to Citations</a>
          </div>
        </div>
      </div>
    </div>`;
}

// Toglie le opere con OMID ripetuto.
function _skgifDedupe(products) {
  const seen = new Set();
  return products.filter(p => {
    const key = p.local_identifier;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Bottone "Back to top", visibile dopo aver scrollato.
function _initAuthorListUi() {
  const top = document.getElementById('ra-top');
  if (!top) return;
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => top.classList.toggle('d-none', window.scrollY < 800));
}

// --- Grafici ---

// Grafico a barre con il numero di date per anno (date vuote saltate).
// fill = altezza in px, larghezza piena; onYear(anno) = clic su una barra.
function _skgifYearChart(box, dates, label, emptyMessage, fill, onYear) {
  const perYear = {}; // anno -> quante date
  dates.forEach(date => {
    const year = String(date || '').slice(0, 4);
    if (/^\d{4}$/.test(year)) perYear[year] = (perYear[year] || 0) + 1;
  });
  const years = Object.keys(perYear).sort();
  if (!years.length) {
    box.innerHTML = `<em>${emptyMessage}</em>`;
    return;
  }
  box.innerHTML = fill
    ? `<div style="position: relative; width: 100%; max-width: ${Math.min(600, 150 + years.length * 80)}px; margin: 0 auto; height: ${fill}px;"><canvas></canvas></div>` // pochi anni = grafico più stretto
    : '<canvas style="display: block; margin: 0 auto;"></canvas>';
  new Chart(box.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{ label, backgroundColor: '#9a31fc', data: years.map(y => perYear[y]), borderWidth: 1, maxBarThickness: 60 }]
    },
    options: {
      responsive: !!fill,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onClick: onYear && ((event, bars) => { if (bars.length) onYear(years[bars[0].index]); }),
      onHover: onYear && ((event, bars) => { event.native.target.style.cursor = bars.length ? 'pointer' : ''; }),
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1, callback: v => Number.isInteger(v) ? v : '' } } }
    }
  });
}

function _skgifSetField(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Un numero, o "–" se la chiamata è fallita (null).
function _ciCount(n) {
  return n === null ? '–' : String(n);
}


/*
################################################################################
# 3. RICERCA AUTORI (aut_free_text)
################################################################################
*/
// Ricerca autori. search_query arriva dalla home come "given=...&family=..."
// oppure "scheme=orcid&id=..." (ricerca per ID). Il nome viene cercato così come è scritto.
function api_search_author_skgif(...args) {
  const plan = _skgifSearchPlan('persons', _skgifUrlParam(args[1], 'search_query')); // URL e titolo, come il #preprocess
  _skgifRunSearch(plan, _renderAuthorCard, plan.fields && (items => _rankAuthorsByQuery(items, plan.fields))); // match esatti in cima
}

// Legge {given, family} da search_query.
function _authorSearchFields(query) {
  if (!query.includes('=')) { // testo libero: ultima parola = cognome, le altre = nome
    const words = query.normalize('NFC').trim().split(/\s+/).filter(Boolean);
    return { given: words.slice(0, -1).join(' '), family: words[words.length - 1] || "" };
  }
  const params = new URLSearchParams(query);
  const get = key => (params.get(key) || "").normalize('NFC').trim();
  return { given: get('given'), family: get('family') };
}

// Nome in minuscolo, con apostrofi e trattini come spazi, per confrontarlo con la ricerca.
function _normName(s) {
  return String(s || "").toLowerCase()
    .replace(/[,"'\\*&#%\u2019-]/g, ' ') //apostrofi, trattini e caratteri tolti dagli URL
    .split(/\s+/).filter(Boolean).join(' ');
}

// Mette in cima le persone il cui nome corrisponde esattamente a quello cercato.
function _rankAuthorsByQuery(items, fields) {
  const same = (a, b) => _normName(a) === _normName(b);
  const score = person =>
    (fields.family && !same(person.family_name, fields.family) ? 1 : 0) +
    (fields.given && !same(person.given_name, fields.given) ? 1 : 0);
  return items
    .map((item, i) => ({ item, i, s: score(item) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map(x => x.item);
}

// Card di una persona nei risultati.
function _renderAuthorCard(person) {
  const omid = _skgifOmid(person.local_identifier);
  if (!omid) return "";

  const identifiers = _skgifArray(person.identifiers);
  const orcid = _skgifEscape(identifiers.find(i => i.scheme === "orcid")?.value || "");

  const fullname = (person.name || "").trim()
    || `${person.given_name || ""} ${person.family_name || ""}`.trim()
    || "Unknown Name";

  const orcidHtml = orcid
    ? `<a href="https://orcid.org/${orcid}" target="_blank" class="text-dark text-decoration-none">${orcid}</a>`
    : '<span class="skgif-none">No ORCID found</span>';

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(fullname)}</a>
          </h5>
          <hr>

          <div class="mb-2">
            <span class="metadata-label fw-bold">ORCID:</span><br>
            <span>${orcidHtml}</span>
          </div>

          <div class="mb-2">
            <span class="metadata-label fw-bold">Other identifiers:</span><br>
            <span>${_skgifIdList(identifiers.filter(i => i.scheme !== "orcid"), omid)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

/*
################################################################################
# 4. RICERCA DOCUMENTI (doc_free_text)
################################################################################
*/
// Ricerca documenti: una sola chiamata /products?filter=cf.search.title:...
function api_search_doc_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('products', _skgifUrlParam(args[1], 'search_query')), _renderDocumentCard);
}

// Intestazione delle pagine documento, citazioni e riferimenti, una informazione per riga:
//   Titolo
//   Primi 3 autori, et al. · Anno · Rivista Vol(Numero), Pagine
//   doi:... · br/<id>
function _skgifHeaderLines(product, omid) {
  const text = _skgifHeaderText(product, omid);
  return _skgifHeaderHtml(text.title, text.line, text.meta);
}

// Le tre righe dell'intestazione come testo { title, line, meta }.
function _skgifHeaderText(product, omid) {
  const agents = role => _skgifContributors(product.contributions, role);
  const apaName = by => {
    if (!by.family_name) return (by.name || '').trim() || 'Unknown Name';
    const initials = String(by.given_name || '').split(/[\s-]+/).filter(Boolean).map(g => `${g[0]}.`).join(' ');
    return initials ? `${by.family_name}, ${initials}` : by.family_name;
  };
  const nameList = list => {
    const names = list.slice(0, 3).map(apaName);
    if (list.length > 3) return `${names.join(', ')}, et al.`;
    return names.length > 1 ? `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}` : names.join('');
  };
  const authors = agents('author');
  const editors = agents('editor');
  const who = authors.length ? nameList(authors)
    : editors.length ? `${nameList(editors)} (${editors.length > 1 ? 'Eds.' : 'Ed.'})` : '';

  const manifestations = _skgifArray(product.manifestations);
  const biblio = (manifestations[0] || {}).biblio || {};
  const venue = manifestations.map(m => m?.biblio?.in).find(v => v && v.name);
  const year = String(_skgifProductRawDate(product) || '').slice(0, 4);
  const pageRange = _skgifPageRange(biblio, '–');
  let where = '';
  if (venue) {
    where = venue.name;
    if (biblio.volume) where += ` ${biblio.volume}`;
    if (biblio.issue) where += `(${biblio.issue})`;
    if (pageRange) where += `, ${pageRange}`;
  } else {
    where = agents('publisher').map(apaName).join(', ');
  }
  const doi = _skgifArray(product.identifiers).find(i => i.scheme === 'doi')?.value;
  return {
    title: _skgifProductTitle(product),
    line: [who, year, where].filter(Boolean).join(' · '),
    meta: [doi ? `doi:${doi}` : '', omid].filter(Boolean).join(' · ')
  };
}

// HTML dell'intestazione dalle sue tre righe.
function _skgifHeaderHtml(title, lineText, meta) {
  const line = (cls, text) => text ? `<div class="${cls}" title="${_skgifEscape(text)}">${_skgifEscape(text)}</div>` : '';
  return line('skgif-head-title', title) + line('skgif-head-line', lineText) + line('skgif-head-meta', meta);
}

// Card di un documento nei risultati (anche nelle liste di citazioni/riferimenti).
function _renderDocumentCard(product) {
  const omid = _skgifOmid(product.local_identifier);
  if (!omid) return ""; // senza OMID niente card

  const title = _skgifProductTitle(product);

  // Autori (o editor se mancano), con link
  const { label: agentsLabel, html: formattedAuthors } = _skgifAuthorsOrEditors(product.contributions);

  // Data e rivista vengono dalla manifestation.
  const formattedDate = _skgifProductDate(product);
  const formattedSource = _skgifProductSource(product);

  const formattedIds = _skgifIdList(product.identifiers, omid) || 'No ID';

  // Tipo accanto al titolo; publisher solo se non c'è la rivista.
  const type = _skgifArray(product.manifestations)
    .map(m => m?.type?.labels?.en).find(Boolean) || '';
  const publisher = formattedSource ? '' : _skgifAgents(product.contributions, 'publisher');

  const ocRecordUrl = `browser.html?value=${omid}`;
  const refUrl = `browser.html?value=doc_ref/${omid}`;
  const citUrl = `browser.html?value=doc_cit/${omid}`;

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
            <h5 class="card-title mb-0">
              <a href="${ocRecordUrl}">${_skgifEscape(title)}</a>
            </h5>
            ${type ? `<span class="badge ra-year-badge flex-shrink-0">${_skgifEscape(type)}</span>` : ''}
          </div>
          <hr>

          <div class="mb-2">
            <span class="metadata-label fw-bold">${agentsLabel}:</span><br>
            <span>${formattedAuthors}</span>
          </div>

          <div class="mb-2">
            <span class="metadata-label fw-bold">Publication Date:</span><br>
            <span>${formattedDate}</span>
          </div>

          ${formattedSource ? `
          <div class="mb-2">
            <span class="metadata-label fw-bold">Source:</span><br>
            <span>${formattedSource}</span>
          </div>` : ''}

          ${publisher ? `
          <div class="mb-2">
            <span class="metadata-label fw-bold">Publisher:</span><br>
            <span>${publisher}</span>
          </div>` : ''}

          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${formattedIds}</span>
          </div>
        </div>

        <div class="d-flex justify-content-end px-3 pb-2 gap-2">
          <a href="${refUrl}" class="btn btn-sm">Go to References</a>
          <a href="${citUrl}" class="btn btn-sm">Go to Citations</a>
        </div>
      </div>
    </div>`;
}

/*
################################################################################
# 5. CITAZIONI E RIFERIMENTI (doc_citations, doc_references)
################################################################################
*/
// Citazioni e riferimenti di un documento:
//   cf.cites:<omid>     -> chi cita il documento (citazioni)
//   cf.cited_by:<omid>  -> cosa cita il documento (riferimenti)
function api_doc_citations_skgif(...args) {
  _skgifCitationList(args[1], 'cf.cites', 'No citations found.');
}

function api_doc_references_skgif(...args) {
  _skgifCitationList(args[1], 'cf.cited_by', 'No references found.');
}

function _skgifCitationList(lucinda_main_data, filter, emptyMessage) {
  const id = _skgifUrlParam(lucinda_main_data, 'id').trim();
  if (!id) {
    _skgifShowMessage(emptyMessage);
    return;
  }

  const omidUrl = `https://w3id.org/oc/meta/br/${id}`; // OMID completo
  // intestazione e conteggio li mette Lucinda
  createSkgifPaginatedSearch({
    sources: [`${SKGIF_API}/products?filter=${filter}:${encodeURIComponent(omidUrl)}`],
    renderItem: _renderDocumentCard,
    emptyMessage,
    missingNoun: filter === 'cf.cites' ? 'citation' : 'reference' // una citazione che non arriva non blocca la lista
  }).search();
}

/*
################################################################################
# 6. RICERCA RIVISTE (venue_free_text)
################################################################################
*/
// Ricerca riviste: una chiamata /venues?filter=cf.search.name:... (tutti i tipi di venue).
// Publisher ed editor arrivano da una seconda chiamata (_loadVenueAgents()).
function api_search_venue_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('venues', _skgifUrlParam(args[1], 'search_query')), _renderVenueCard);
}

// Card di una rivista nei risultati; publisher ed editor vengono aggiunti dopo nel box .venue-agents.
function _renderVenueCard(venue) {
  const omid = _skgifOmid(venue.local_identifier);
  if (!omid) return "";

  const type = venue.type
    ? `<div class="mb-2"><span class="metadata-label fw-bold">Type:</span><br><span>${_skgifEscape(venue.type)}</span></div>`
    : '';

  const html = `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(venue.name || 'Unknown Title')}</a>
          </h5>
          <hr>
          ${type}
          <div class="venue-agents" data-venue-omid="${omid}"></div>
          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${_skgifIdList(venue.identifiers, omid)}</span>
          </div>
        </div>
      </div>
    </div>`;
  _loadVenueAgents(omid);
  return html;
}

// Publisher ed editor di una rivista: /venues non li ha, ma la stessa OMID chiesta
// a /products restituisce la rivista con le sue contributions.
function _loadVenueAgents(omid) {
  skgifFetch(`${SKGIF_API}/products/https://w3id.org/oc/meta/${omid}`).then(data => { // una chiamata per ogni rivista
    const contributions = (data?.['@graph'] || [])[0]?.contributions;
    const row = (role, label) => {
      const agents = _skgifAgents(contributions, role);
      return agents
        ? `<div class="mb-2"><span class="metadata-label fw-bold">${label}:</span><br><span>${agents}</span></div>`
        : '';
    };
    const html = row('publisher', 'Publisher') + row('editor', 'Editor');
    document.querySelectorAll(`.venue-agents[data-venue-omid="${omid}"]`)
      .forEach(box => { box.innerHTML = html; });
  });
}

/*
################################################################################
# 7. RICERCA ORGANIZZAZIONI (org_free_text)
################################################################################
*/
// Ricerca organizzazioni: una chiamata /organisations?filter=cf.search.name:... (record mostrati così come arrivano).
function api_search_org_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('organisations', _skgifUrlParam(args[1], 'search_query')), _renderOrgCard);
}

// Card di un'organizzazione nei risultati; il nome porta alla sua scheda.
function _renderOrgCard(org) {
  const omid = _skgifOmid(org.local_identifier);
  if (!omid) return "";

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(org.name || 'Unknown Name')}</a>
          </h5>
          <hr>
          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${_skgifIdList(org.identifiers, omid)}</span>
          </div>
        </div>
      </div>
    </div>`;
}


/*
################################################################################
# 8. RECORD DI CITAZIONE (new_ci_browser)
################################################################################
*/
// Record di citazione. L'OCI è "<omid citante>-<omid citato>". Chiamate (blocchi #api del .hf, in parallelo):
//   /products/<omid> x 2                       -> i due documenti
//   cf.cited_by / cf.cites                     -> References / Citations di ognuno
//   cf.cited_by:<a>,cf.cited_by:<b>            -> riferimenti in comune
//   cf.cites:<a>,cf.cites:<b>                  -> co-citazioni
// I grafici "Citations per year" vengono dall'Index API.

// #preprocess di Lucinda: divide l'OCI in { citing, cited }; {} se non è valido.
function pre_skgif_oci(oci) {
  let value = String(oci || '');
  try { value = decodeURIComponent(value); } catch (e) { /* keep as is */ }
  const parts = value.trim().replace(/^oci:/i, '').match(/^(\d+)-(\d+)$/);
  return parts ? { citing: parts[1], cited: parts[2] } : {};
}

// #postprocess di Lucinda per i due documenti: stato (found/missing/failed), dati e OMID citati.
function post_skgif_ci_doc(res, id) {
  const header = ['status', 'omid', 'title', 'agents_label', 'agents', 'date', 'ids', 'cites'];
  const omid = `br/${id}`;
  const doc = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null;
  if (!doc?.local_identifier) return [header, [doc ? 'missing' : 'failed', omid, '', 'Authors', [], '', [], []]];
  const agents = role => _skgifContributors(doc.contributions, role).map(by => ({
    name: _skgifAgentPlainName(by),
    omid: _skgifOmid(by.local_identifier),
    orcid: _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value || ''
  }));
  const authors = agents('author');
  const editors = authors.length ? [] : agents('editor'); // editor al posto degli autori se mancano
  return [header, ['found', omid, _skgifProductTitle(doc), editors.length ? 'Editors' : 'Authors',
    authors.length ? authors : editors,
    String(_skgifProductRawDate(doc) || '').slice(0, 10),
    _skgifArray(doc.identifiers).map(i => ({ scheme: i.scheme, value: i.value })),
    _skgifArray(doc.related_products?.cites)]];
}

// Errore del record (OCI non valido, documento mancante, citazione inesistente): { text, type } o null.
function _skgifCiProblem(oci, citingStatus, citedStatus, cites) {
  const ids = pre_skgif_oci(oci);
  if (!ids.citing) return { text: 'This is not a valid OCI.', type: 'danger' };
  if (citingStatus === 'failed' || citedStatus === 'failed') return { text: SKGIF_FAILED_MESSAGE, type: 'danger' };
  const missing = [[citingStatus, ids.citing], [citedStatus, ids.cited]].filter(([status]) => status !== 'found').map(([, id]) => `br/${id}`);
  if (missing.length) return { text: `No document with OMID ${missing.join(' or ')} available.`, type: 'danger' };
  if (!_skgifArray(cites).includes(`https://w3id.org/oc/meta/br/${ids.cited}`)) return { text: 'This citation is not available.', type: 'warning' };
  return null;
}

// View function: il messaggio sopra il record ("" se non c'è).
Lucinda_view.prototype.skgif_ci_message = function (...args) {
  const problem = _skgifCiProblem(...args.map(_lvCell));
  return problem ? `<div class="alert alert-${problem.type} mb-4">${_skgifEscape(problem.text)}</div>` : '';
};

// #callfun: mostra il record e disegna i due grafici.
function api_citation_record_skgif(...args) {
  const oci = _skgifUrlParam(args[1], 'oci');
  if (_skgifCiProblem(oci, _lucindaValue('citing_meta', 'status'), _lucindaValue('cited_meta', 'status'), _lucindaValue('citing_meta', 'cites'))) return;
  const { citing, cited } = pre_skgif_oci(oci);
  document.getElementById('ci-record')?.classList.remove('d-none');
  _ciAlignTitles();
  _skgifCitationsPerYearChart('ci-citing-chart', citing); // grafici per anno dall'Index
  _skgifCitationsPerYearChart('ci-cited-chart', cited);
}

// Rende alti uguali i due titoli quando le schede sono affiancate.
function _ciAlignTitles() {
  const titles = ['citing-title', 'cited-title'].map(id => document.getElementById(id)).filter(Boolean);
  const align = () => {
    titles.forEach(t => { t.style.minHeight = ''; });
    if (window.innerWidth < 768) return; // schede una sotto l'altra
    const height = Math.max(...titles.map(t => t.offsetHeight));
    titles.forEach(t => { t.style.minHeight = `${height}px`; });
  };
  align();
  window.addEventListener('resize', align);
}

// Grafico "Citations per year" di un documento, dall'Index API (una sola chiamata,
// che dà tutte le citazioni con la data). Le citazioni senza data sono saltate.
const OC_INDEX_API = "https://api.opencitations.net/index/v2";

function _skgifCitationsPerYearChart(boxId, id) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = '<em>Loading...</em>';
  skgifFetch(`${OC_INDEX_API}/citations/omid:br/${id}`).then(data => {
    if (!Array.isArray(data)) {
      box.innerHTML = '<em>Chart not available (the OpenCitations Index did not return the citations).</em>';
      return;
    }
    _skgifYearChart(box, data.map(c => c.creation), '# Citations', 'No citations found.', 200);
  });
}


/*
################################################################################
# 9. PROFILO AUTORE (new_ra_browser)
################################################################################
*/
// Profilo autore:
//   /persons/<omid>                                        -> nome, ORCID, identificativi
//   /products?filter=contributions.by.local_identifier:<omid> -> tutte le opere (tutti i ruoli)
// Nome, ID e conteggio li mette Lucinda; il JS scarica tutte le opere (lista, Sort by, filtri, grafico).

// #postprocess di Lucinda per author_meta: dati della persona (l'HTML lo fanno le view functions).
function post_skgif_person(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'orcid', 'ids'];
  const omid = `ra/${id}`;
  const person = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessuna persona, null = chiamata fallita
  if (!person?.local_identifier) {
    const message = person ? `No author or organisation with OMID ${omid} available.` : `Resource ${omid} could not be loaded. Try again later.`;
    return [header, ['', message, omid, omid, '', '', []]];
  }
  const identifiers = _skgifArray(person.identifiers);
  const name = `${person.given_name || ''} ${person.family_name || ''}`.trim() || (person.name || '').trim() || 'Unknown Author';
  return [header, ['true', '', omid, name, name,
    identifiers.find(i => i.scheme === 'orcid')?.value || '',
    identifiers.filter(i => i.scheme !== 'orcid').map(i => ({ scheme: i.scheme, value: i.value }))]];
}

// #callfun: mostra il record e carica tutte le opere.
function api_author_record_skgif(...args) {
  if (!_lucindaValue('author_meta', 'found')) return; // messaggio già scritto da Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = `https://w3id.org/oc/meta/ra/${id}`;
  const works = `${SKGIF_API}/products?filter=contributions.by.local_identifier:${encodeURIComponent(omidUrl)}`;

  document.getElementById('ra-record')?.classList.remove('d-none');
  _skgifSetField('ra-pubs-chart', '<em>Loading...</em>');
  skgifFirstPage(works, SKGIF_DEFAULT_PAGE_SIZE) // prima pagina: già scaricata da Lucinda
    .then(page => _loadAuthorWorks(works, page, omidUrl));
}

// Quante pagine di opere chiedere in parallelo.
const SKGIF_AUTHOR_PARALLEL_PAGES = 6;

// Scarica tutte le opere dell'autore e le mostra man mano, in ordine, con la barra di avanzamento.
// Quando sono arrivate tutte attiva Sort by, filtri (Type, Year, Role) e disegna il grafico.
// personOmid: OMID completo della persona, per trovare il suo ruolo in ogni opera.
let _raPersonOmid = '';

function _loadAuthorWorks(works, firstPage, personOmid) {
  _raPersonOmid = personOmid;
  const container = document.getElementById('search-results-container');
  const chart = document.getElementById('ra-pubs-chart');
  const setChart = html => { if (chart) chart.innerHTML = html; };
  _initAuthorListUi();
  let order = 'default', keep = null, term = ''; // ordinamento, filtri e parole cercate nel titolo
  let show = () => {};
  let downloaded = false;
  const filters = _skgifListFilters(document.getElementById('ra-filters'), ['type', 'year', 'role'], newKeep => { keep = newKeep; show(); });

  const hideTools = () => { // 0-1 opere: niente filtri, Sort by e ricerca
    document.getElementById('ra-filters')?.parentElement.classList.add('d-none');
    document.getElementById('ra-search')?.classList.add('d-none');
  };
  if (!firstPage || firstPage.total < 2) hideTools();
  if (!firstPage) {
    _skgifFallbackCount('search-total-count', '–');
    if (container) container.innerHTML = '<div class="col-12"><p>The publications could not be loaded (the API did not answer).</p></div>';
    setChart('<em>Chart not available.</em>');
    return _setAuthorListStatus('', null);
  }
  const total = firstPage.total;
  _skgifFallbackCount('search-total-count', total);
  if (!total) {
    if (container) container.innerHTML = '<div class="col-12"><p>No publications found.</p></div>';
    setChart('<em>No publications found.</em>');
    return _setAuthorListStatus('No publications', null);
  }

  const pageCount = Math.ceil(total / SKGIF_DEFAULT_PAGE_SIZE);
  const pages = new Array(pageCount); // opere di ogni pagina
  pages[0] = firstPage.items;
  let shownPages = 0; // pagine già mostrate
  setChart('<em>Loading...</em>');

  const loadedCount = () => pages.reduce((n, page) => n + (page ? page.length : 0), 0);
  const showArrived = () => { // mostra le pagine in fila, senza buchi
    const loaded = Math.min(loadedCount(), total);
    _skgifSetNote('ra-note', loaded < total ? `Loading publications… ${loaded}/${total}` : '');
    if (term) return;
    let html = '';
    while (shownPages < pageCount && pages[shownPages]) html += pages[shownPages++].map(_renderAuthorWorkOrMissing).join('');
    if (html && container) container.insertAdjacentHTML('beforeend', html);
    _setAuthorListStatus(_skgifPlural(total, 'publication'), loaded / total);
  };
  if (container) container.innerHTML = '';
  showArrived();

  // Ricerca nel titolo mentre le opere arrivano ancora: la fa l'API.
  const searchApi = value => {
    term = value;
    if (!term) {
      shownPages = 0;
      if (container) container.innerHTML = '';
      return showArrived();
    }
    _setAuthorListStatus('Searching…', null);
    if (container) container.innerHTML = SKGIF_LOADING_HTML;
    const source = `${works},cf.search.title:${encodeURIComponent(term)}`;
    const found = n => `${_skgifPlural(n, 'publication')} with “${value}” in the title`;
    skgifFirstPage(source, SKGIF_DEFAULT_PAGE_SIZE).then(first => {
      if (term !== value || downloaded) return;
      if (!first) {
        if (container) container.innerHTML = '';
        return _setAuthorListStatus('The search could not be made (the API did not answer).', null);
      }
      const foundPages = [first.items];
      skgifFetchAllPages(source, first.total, SKGIF_DEFAULT_PAGE_SIZE, SKGIF_AUTHOR_PARALLEL_PAGES, (n, items) => { foundPages[n - 1] = items; }, { 1: first.items }).then(() => {
        if (term !== value || downloaded) return;
        const results = _skgifDedupe(foundPages.flat());
        if (container) container.innerHTML = results.map(_renderAuthorWorkOrMissing).join('');
        _setAuthorListStatus(found(first.total), null);
      });
    });
  };
  _initAuthorSearch(value => downloaded ? null : searchApi(value));

  const onPage = (n, items) => { pages[n - 1] = items; showArrived(); };
  skgifFetchAllPages(works, total, SKGIF_DEFAULT_PAGE_SIZE, SKGIF_AUTHOR_PARALLEL_PAGES, onPage, { 1: pages[0] }).then(() => {
    const inOrder = _skgifDedupe(pages.flat());
    const all = inOrder.filter(w => !w._skgifMissing);
    const missing = inOrder.length - all.length;
    const missingNote = missing ? ` (${missing} could not be loaded)` : '';
    _skgifYearChart(chart, all.map(_skgifProductRawDate), '# Publications', 'No publications found.', 200, year => {
      if (filters.select('year', year)) document.getElementById('ra-pubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); // clic su un anno: le opere di quell'anno
    });
    if (missing) chart.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, 'publication')} could not be loaded</div>`);
    const plural = n => _skgifPlural(n, 'publication');
    _skgifSetNote('ra-note', '');
    downloaded = true;

    show = () => {
      _skgifScrollToList(document.getElementById('ra-pubs'));
      let works = keep ? all.filter(keep) : order === 'default' && !term ? inOrder : all;
      if (term) works = works.filter(w => _raTitleHas(w, term));
      container.innerHTML = works.length ? _renderAuthorWorks(works, order, _renderAuthorWorkOrMissing) : '';
      const found = n => `${plural(n)} with “${term}” in the title`;
      _setAuthorListStatus(term && keep ? `${works.length} of ${found(all.filter(w => _raTitleHas(w, term)).length)}`
        : term ? found(works.length) : !keep ? plural(all.length) + missingNote : `${works.length} of ${plural(all.length)}`, null);
    };
    filters.fill(all); // Role solo se è autore di alcune opere ed editor di altre
    _onAuthorSearch = value => {
      term = value;
      filters.setMatch(term ? w => _raTitleHas(w, term) : null);
      show();
    };
    _onAuthorSearch(term);
    document.querySelectorAll('#ra-sort button').forEach(button => {
      button.disabled = false;
      button.addEventListener('click', () => {
        document.querySelectorAll('#ra-sort button').forEach(b => b.classList.toggle('active', b === button));
        order = button.dataset.order;
        show();
      });
    });
  });
}

// "Search in titles" del profilo autore: filtra le opere già scaricate, senza chiamate.
let _onAuthorSearch = null;

function _initAuthorSearch(onSearch) {
  const form = document.getElementById('ra-search');
  const input = document.getElementById('ra-search-input');
  const reset = document.getElementById('ra-search-reset');
  _onAuthorSearch = onSearch;
  if (!form || !input || !reset) return;
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  const search = value => {
    reset.classList.toggle('d-none', !value);
    _onAuthorSearch(value);
  };
  reset.addEventListener('click', () => {
    input.value = '';
    search('');
  });
  input.addEventListener('input', () => { // testo cancellato: torna la lista di prima
    if (!input.value.trim() && !reset.classList.contains('d-none')) search('');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    _skgifKeepCursor(input);
    search(_skgifSafeTerm(input.value));
  });
}

// Vero se ogni parola cercata è l'inizio di una parola del titolo (come cf.search.title dell'API).
function _raTitleHas(product, term) {
  const words = _skgifProductRawTitle(product).toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return term.toLowerCase().split(' ').filter(Boolean).every(part => words.some(word => word.startsWith(part)));
}

// Ruoli della persona del profilo in un'opera.
function _raPersonRoles(product) {
  const contributions = _skgifArray(product.contributions);
  return new Set(contributions.filter(c => c && c.by && c.by.local_identifier === _raPersonOmid).map(c => c.role));
}

// Testo di stato e barra di avanzamento del profilo autore.
function _setAuthorListStatus(text, fraction) {
  _skgifListStatus('ra-sort-status', 'ra-progress', text, fraction);
}

// Badge "Editor" del profilo autore.
function _raEditorBadge(roles) {
  return !roles.has('editor') ? '' : roles.has('author') ? 'Author &amp; Editor' : 'Editor';
}

// Card di un'opera, o card "could not be loaded".
function _renderAuthorWorkOrMissing(work) {
  return work._skgifMissing ? _skgifMissingCard('publication') : _skgifWorkCard(work);
}

// HTML della lista nell'ordine scelto (per data con un'intestazione per anno).
function _renderAuthorWorks(works, order, renderCard = _skgifWorkCard) {
  const sorted = _sortAuthorWorks(works, order);
  if (order !== 'newest' && order !== 'oldest') return sorted.map(work => renderCard(work)).join('');
  let lastYear = null;
  return sorted.map(work => {
    const year = String(_skgifProductRawDate(work) || '').slice(0, 4) || 'No date';
    const heading = year !== lastYear ? `<div class="col-12"><h6 class="ra-year-heading">${_skgifEscape(year)}</h6></div>` : '';
    lastYear = year;
    return heading + renderCard(work);
  }).join('');
}

// Le opere nell'ordine scelto: API, data (senza data in fondo) o titolo.
function _sortAuthorWorks(works, order) {
  const date = p => _skgifProductRawDate(p) || '';
  const title = p => _skgifProductTitle(p);
  const byDate = dir => (a, b) => (!date(a) - !date(b)) || dir * date(a).localeCompare(date(b));
  const byTitle = dir => (a, b) => dir * title(a).localeCompare(title(b), undefined, { sensitivity: 'base' });
  const compare = { newest: byDate(-1), oldest: byDate(1), 'title-asc': byTitle(1), 'title-desc': byTitle(-1) }[order];
  return compare ? [...works].sort(compare) : works;
}

/*
################################################################################
# 10. SCHEDA DOCUMENTO (new_br_any_browser)
################################################################################
*/
// Scheda documento:
//   /products/<omid>                    -> tutti i dati del documento
//   cf.cited_by:<omid> / cf.cites:<omid> -> References / Citations, a pagine da 50
// Dati e conteggi li mette Lucinda; il JS fa le due liste (tab), i loro strumenti e il grafico.
// Fino a SKGIF_DOC_AUTO_LOAD le citazioni si scaricano da sole, sopra serve il bottone.

// #callfun: Lucinda ha già messo dati e conteggi; qui si mostrano il record, le liste e il grafico.
function api_document_record_skgif(...args) {
  if (!_lucindaValue('doc_meta', 'found')) return; // documento mancante o chiamata fallita: il messaggio l'ha già messo Lucinda
  const id = _skgifUrlParam(args[1], 'omid_digit').trim();

  const omidUrl = `https://w3id.org/oc/meta/br/${id}`;
  const listSource = filter => `${SKGIF_API}/products?filter=${filter}:${encodeURIComponent(omidUrl)}`;
  const refsSource = listSource('cf.cited_by');
  const citsSource = listSource('cf.cites');

  _initBrTabs();
  _initAuthorListUi();
  _skgifSetField('br-cits-chart', '<em>Loading...</em>');
  document.getElementById('br-record')?.classList.remove('d-none');

  // Prima pagina = quella di Lucinda. Gli scaricamenti automatici partono uno dopo l'altro, prima le citazioni.
  const tools = (kind, list, source) => _skgifListTools({
    prefix: `br-${kind}`, list, source, autoLoad: SKGIF_DOC_AUTO_LOAD, maxLoad: SKGIF_DOC_MAX_LOAD, noun: kind === 'refs' ? 'reference' : 'citation',
    search: { noun: kind === 'refs' ? 'reference' : 'citation', statusNoun: kind === 'refs' ? 'reference' : 'citation', scrollId: 'br-lists', renderCard: _skgifWorkCard }
  });
  const citsLoaded = skgifFirstPage(citsSource, SKGIF_DEFAULT_PAGE_SIZE).then(citsPage => {
    const cits = _brList('cits', citsSource, citsPage);
    const filters = tools('cits', cits, citsSource);
    _skgifListChart(cits, { boxId: 'br-cits-chart', noun: 'citation', owner: 'document', label: '# Citations',
      autoLoad: SKGIF_DOC_AUTO_LOAD, maxLoad: SKGIF_DOC_MAX_LOAD, buttonText: 'Load all citations',
      buttonNote: 'Load them all to see the chart and to sort and filter the list.', // sotto la soglia scarica tutte le citazioni, sopra aspetta il bottone
      onYear: year => { // clic su un anno: le citazioni di quell'anno
        document.querySelector('[data-br-tab="cits"]')?.click();
        if (filters.select('year', year)) document.getElementById('br-lists')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } });
    if (!cits.failed && cits.total && cits.total <= SKGIF_DOC_AUTO_LOAD) return new Promise(done => cits.onLoaded(done));
  });
  skgifFirstPage(refsSource, SKGIF_DEFAULT_PAGE_SIZE).then(refsPage => {
    const refs = _brList('refs', refsSource, refsPage);
    tools('refs', refs, refsSource);
    if (refs.total <= SKGIF_DOC_AUTO_LOAD) citsLoaded.then(() => refs.loadAll());
  });
}

// Soglie della scheda documento: scaricamento automatico fino ad AUTO_LOAD, con il bottone fino a MAX_LOAD.
const SKGIF_DOC_AUTO_LOAD = 250;
const SKGIF_DOC_MAX_LOAD = 1500;

// #postprocess di Lucinda per doc_meta: una riga con i dati del documento (niente HTML).
// "" = nessun valore (la riga del template viene nascosta).
function post_skgif_document(res, id) {
  const header = ['found', 'message', 'omid', 'title', 'head_line', 'head_meta', 'authors', 'editors', 'publisher',
    'date', 'type', 'volume', 'issue', 'pages', 'source', 'ids'];
  const omid = `br/${id}`;
  const doc = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessun documento, null = chiamata fallita
  if (!doc?.local_identifier) {
    const message = doc ? `No document or venue with OMID ${omid} available.` : `Resource ${omid} could not be loaded. Try again later.`;
    return [header, ['', message, omid, '', '', '', [], [], [], '', '', '', '', '', '', []]];
  }
  const manifestation = _skgifArray(doc.manifestations)[0] || {};
  const biblio = manifestation.biblio || {};
  const venue = _skgifProductVenue(doc);
  const head = _skgifHeaderText(doc, omid);
  const agents = role => _skgifContributors(doc.contributions, role).map(by => ({ name: _skgifAgentPlainName(by), omid: _skgifOmid(by.local_identifier) }));
  return [header, [
    '1',
    '',
    omid,
    head.title,
    head.line,
    head.meta,
    agents('author'),
    agents('editor'),
    agents('publisher'),
    String(_skgifProductRawDate(doc) || '').slice(0, 10),
    manifestation.type?.labels?.en || '',
    biblio.volume || '',
    biblio.issue || '',
    _skgifPageRange(biblio, '-'),
    venue ? { name: venue.name, omid: _skgifOmid(venue.local_identifier), identifiers: _skgifArray(venue.identifiers) } : '',
    _skgifArray(doc.identifiers).map(i => ({ scheme: i.scheme, value: i.value }))
  ]];
}



// Tab References / Citations.
function _initBrTabs() {
  const tabs = document.querySelectorAll('[data-br-tab]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
      document.getElementById(`br-${t.dataset.brTab}-pane`)?.classList.toggle('d-none', !active);
    });
  }));
}

// Lista References ('refs') o Citations ('cits') della scheda documento.
function _brList(kind, source, first) {
  const noun = kind === 'refs' ? 'reference' : 'citation';
  return _skgifPagedList({
    prefix: `br-${kind}`, source, first, noun,
    emptyMessage: `No ${noun}s found.`,
    statusText: n => _skgifPlural(n, noun),
    scrollId: 'br-lists',
    renderCard: _skgifWorkCard
  });
}

/*
################################################################################
# 11. SCHEDA ORGANIZZAZIONE (new_org_browser)
################################################################################
*/
// Scheda organizzazione: si apre per un ra/ che non è in /persons.
//   /organisations/<omid>                                    -> nome, identificativi
//   /products?filter=contributions.by.local_identifier:<omid> -> le sue pubblicazioni
// Lista sfogliabile come nella scheda documento; grafico, filtri e Sort by solo
// fino a SKGIF_ORG_CHART_MAX pubblicazioni.

// Oltre questo numero di pubblicazioni niente grafico, filtri e ordinamento.
const SKGIF_ORG_CHART_MAX = 2000;

// #postprocess di Lucinda per org_meta: dati dell'organizzazione (l'HTML lo fanno le view functions).
function post_skgif_org(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'crossref', 'ids'];
  const omid = `ra/${id}`;
  const org = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessuna organizzazione, null = chiamata fallita
  if (!org?.local_identifier) {
    const message = org ? `No author or organisation with OMID ${omid} available.` : `Resource ${omid} could not be loaded. Try again later.`;
    return [header, ['', message, omid, omid, '', [], []]];
  }
  const ids = _skgifArray(org.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
  const name = (org.name || '').trim() || 'Unknown Organisation';
  return [header, ['true', '', omid, name, name, ids.filter(i => i.scheme === 'crossref'), ids.filter(i => i.scheme !== 'crossref')]];
}

// #callfun: mostra il record, la lista, il grafico e la ricerca nei titoli.
function api_org_record_skgif(...args) {
  if (!_lucindaValue('org_meta', 'found')) return; // messaggio già scritto da Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = `https://w3id.org/oc/meta/ra/${id}`;
  const works = `${SKGIF_API}/products?filter=contributions.by.local_identifier:${encodeURIComponent(omidUrl)}`;
  _raPersonOmid = omidUrl; // per il ruolo dell'organizzazione in ogni pubblicazione
  document.getElementById('org-record')?.classList.remove('d-none');
  _initAuthorListUi();
  _skgifSetField('org-chart', '<em>Loading publications…</em>');

  skgifFirstPage(works, SKGIF_DEFAULT_PAGE_SIZE).then(first => {
    if (first) _skgifFallbackCount('org-count', first.total);
    const allPublications = _orgList(works, first);
    const filters = _skgifListTools({
      prefix: 'org-pubs', list: allPublications, source: works, autoLoad: SKGIF_CHART_AUTO_LOAD, maxLoad: SKGIF_ORG_CHART_MAX, noun: 'publication',
      search: { noun: 'publication', statusNoun: 'publication', scrollId: 'org-pubs', renderCard: _orgCard }
    });
    _skgifListChart(allPublications, { boxId: 'org-chart', noun: 'publication', owner: 'organisation', label: '# Publications',
      maxLoad: SKGIF_ORG_CHART_MAX, buttonText: 'Load all publications',
      buttonNote: 'Load them all to see the chart and to sort and filter the list.',
      onYear: year => { // clic su un anno: le pubblicazioni di quell'anno
        if (filters.select('year', year)) document.getElementById('org-pubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } });
  });
}

// Tutte le pubblicazioni dell'organizzazione.
function _orgList(source, first) {
  return _skgifPagedList({
    prefix: 'org-pubs', source, first, emptyMessage: '',
    statusText: n => _skgifPlural(n, 'publication'),
    noun: 'publication',
    scrollId: 'org-pubs',
    renderCard: _orgCard
  });
}

// Card di una pubblicazione, con il ruolo dell'organizzazione.
function _orgCard(product) {
  return _skgifWorkCard(product, _orgRoleBadge);
}

// Badge con i ruoli dell'organizzazione ("Author", "Publisher & Author"...).
function _orgRoleBadge(roles) {
  const labels = { author: 'Author', editor: 'Editor' }; // "Publisher" no: lo sono quasi tutte
  return Object.keys(labels).filter(role => roles.has(role)).map(role => labels[role]).join(' &amp; ');
}

/*
################################################################################
# 12. SCHEDA RIVISTA (new_venue_browser)
################################################################################
*/
// Scheda rivista: si apre per un br/ che è in /venues (journal, book, conference...).
//   /venues/<omid>    -> nome, tipo, identificativi (stesso URL del controllo nel main)
//   /products/<omid>  -> publisher ed editor
// Lista, conteggio e grafico delle pubblicazioni in stand-by: SKG-IF non ha un filtro per rivista.

// #postprocess di Lucinda per venue_meta: dati della rivista (l'HTML lo fanno le view functions).
function post_skgif_venue(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'type', 'ids'];
  const omid = `br/${id}`;
  const venue = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessuna rivista, null = chiamata fallita
  if (!venue?.local_identifier) {
    const message = venue ? `No venue with OMID ${omid} available.` : `Resource ${omid} could not be loaded. Try again later.`;
    return [header, ['', message, omid, omid, '', []]];
  }
  const ids = _skgifArray(venue.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
  return [header, ['true', '', omid, (venue.name || '').trim() || omid, venue.type || '', ids]];
}

// #postprocess di Lucinda per venue_agents: publisher ed editor (vuoti se la chiamata fallisce).
function post_skgif_venue_agents(res) {
  const product = res.ok ? (res.json?.['@graph'] || [])[0] : null;
  const agents = role => _skgifContributors(product?.contributions, role).map(by => ({ name: _skgifAgentPlainName(by), omid: _skgifOmid(by.local_identifier) }));
  return [['publisher', 'editors'], [agents('publisher'), agents('editor')]];
}

// #callfun: mostra il record se la rivista esiste.
function api_venue_record_skgif() {
  if (_lucindaValue('venue_meta', 'found')) document.getElementById('venue-record')?.classList.remove('d-none');
}
