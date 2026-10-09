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
SILVIA 
================================================================================
*/

/*
################################################################################
# 1. PAGINAZIONE SKG-IF (condivisa tra le risorse)
################################################################################
*/
/*
--------------------------------
SKG-IF GENERIC PAGINATION (reusable across resources)
--------------------------------
SKG-IF search endpoints default to 10 results per page (max 50), and
already handle the slicing/counting themselves - we don't need our own
result-limiting logic, just a small UI to move between pages. This module
is resource-agnostic: every search (authors, documents, citations,
venues) uses it by giving its own sources and renderItem.

A single delegated click listener (registered once, at the end of this
section) drives every paginated results container, instead of one inline
onclick per search - that's what makes this reusable without name clashes
between resources.

GLOBAL CONSTANTS
*/
const SKGIF_API = "https://api.opencitations.net/skg-if/v1"; //base url di tutte le richieste SKG-IF

const SKGIF_DEFAULT_PAGE_SIZE = 10; // matches the API's own default; not sent as a query param unless overridden, usato per calcolare pagesize

// Shown instead of the results when the API doesn't answer: e.g. a venue
// name of several common words ("journal of humanities") makes the API's
// own SPARQL query time out (HTTP 408 after ~3 minutes). Without this the
// failed search looked like "No results found".
const SKGIF_FAILED_MESSAGE = "The search failed or took too long (the API did not answer). Try again or use a shorter query.";

// total_items of a search response (0 if missing).
function skgifTotal(response) {
  return response?.meta?.part_of?.total_items || 0; //legge il totale già restituito da skgif che viene usato in loadstotal
}

/*
Cache of SKG-IF responses already received in this page, keyed by their
normalized URL. The pages fetched by the paginator (and the venues'
publisher/editor requests) are stored here, so going back to an already
visited page costs no request.
*/
const _skgifResponseCache = {}; //per controllare se una risposta è già in cache per evitare di fare le stesse fetch

function _skgifNormalizeUrl(url) {  //normalizza un URL per poterlo confrontare con altri URL nella cache
  let u = String(url || "").replace(/\+/g, " ");
  try { u = decodeURIComponent(u); } catch (e) { /* keep as is */ }
  return u.trim().toLowerCase();
}

// Requests still in flight, by the same key: asking again for a URL that
// is already loading (e.g. clicking Next while that page is being
// prefetched) waits for that request instead of sending a second one.
const _skgifPendingRequests = {};

// Fetches an SKG-IF URL through the cache. Never rejects: a failed request
// (HTTP error, timeout, network error) resolves to null and is not cached,
// so it is tried again the next time. HTTP 404 is not a failure: the API
// answers 404 to a search with no matches (unknown ISSN/ORCID/Crossref id,
// name with no records...), so it resolves to an empty response (0 items).
//Se la risposta è in cache, la restituisce subito, se la richiesta è già in corso la aspetta, altrimenti fa la query e restituisce il json se tutto va bene, altrimenti null
function skgifFetch(url) {
  const key = _skgifNormalizeUrl(url);
  if (_skgifResponseCache[key]) return Promise.resolve(_skgifResponseCache[key]);
  if (_skgifPendingRequests[key]) return _skgifPendingRequests[key]; //richiesta già in corso: aspetta quella
  return _skgifPendingRequests[key] = fetch(url)
    .then(r => r.ok ? r.json() : r.status === 404 ? {} : null) // SILVIA (SKG-IF): 404 = 0 results
    .then(data => {
      if (data) _skgifResponseCache[key] = data;
      return data;
    })
    .catch(() => null)
    .finally(() => { delete _skgifPendingRequests[key]; });
}

// Keeps LUCINDA's own "Loading the resource..." banner on screen until the
// first page of results is ready, so title, count and results appear all at
// once. LUCINDA replaces the banner with the template and runs the #callfun
// blocks in the same tick (build_success_html_page() in lucinda.js), so the
// template is hidden here before the browser ever paints it. The banner
// markup is the same as Lucinda.add_main_loading_banner() (not called
// directly: it would overwrite the template), styled by lucinda.css.
let _skgifHeldPage = null;

function holdSkgifPage() {  //trattiene il rendering della pagina (nasconde il template e carica il banner di loading)= evitare che l'utente veda il template vuoto mentre skgif carica i dati
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

function releaseSkgifPage() { //ricarica la pagina dopo che abbiamo tutti i dati: rimuove il banner e rimostra il template con i dati
  if (!_skgifHeldPage) return;
  _skgifHeldPage.banner.remove();
  _skgifHeldPage.children.forEach(({ el, display }) => { el.style.display = display; });
  _skgifHeldPage = null;
}

const _skgifPaginators = {};

/*
config:
  sources        - array of SKG-IF search URLs WITHOUT page/page_size (e.g.
                   ".../persons?filter=cf.search.given_name:Serena"). They are
                   paginated as ONE list, one after the other (all of
                   sources[0], then all of sources[1], ...): page N is computed
                   from each source's total_items, so every result is
                   reachable and a page that straddles two sources takes the
                   tail of one and the head of the next. (Merging page N of
                   every source and cutting to pageSize, as done before, made
                   every source but the first unreachable.)
  renderItem(item) -> HTML string for one result card
  rankItems(items) -> optional, reorders the items of a page before rendering
  emptyMessage  - optional text shown when a page has zero results
  pageSize       - optional, defaults to SKGIF_DEFAULT_PAGE_SIZE
  containerId   - optional, id of the element the results (and pagination
                   bar) render into; defaults to 'search-results-container',
                   the one of every search template
  totalCountId   - optional, id of the element showing the results count in
                   the page title (default 'search-total-count'); filled with
                   the total once the first page is rendered (together with
                   releaseSkgifPage(), see holdSkgifPage())
  dedupeKey(item) -> optional, key used to drop duplicates within a page;
                   defaults to the item's local_identifier
*/
function createSkgifPaginatedSearch(config) {   //Gestisce la paginazione
  const containerId = config.containerId || 'search-results-container';
  const totalCountId = config.totalCountId || 'search-total-count';
  const dedupeKey = config.dedupeKey || (item => item.local_identifier || JSON.stringify(item));
  const pageSize = config.pageSize || SKGIF_DEFAULT_PAGE_SIZE;
  const sources = config.sources || [];
  let sourceTotals = null; // total_items of each source, read once on the first page
  let listedTotal = 0;     // sum of sourceTotals: shown in the title, pages are computed on it = Somma dei total_items di ogni fonte SKG-IF

  const pageUrl = (src, apiPage) => `${src}&page=${apiPage}&page_size=${pageSize}`; //costruzione url di ciascuna pagina con numero della pagina corrente

  // Fetches API pages; rejects if any of them failed, so that a failed
  // request is reported as such instead of as a page with no results.
  // scarica più URL in parallelo. Se anche uno solo restituisce null, lancia un errore. Così un fallimento viene mostrato come errore e non come "pagina vuota"
  const fetchAll = urls => Promise.all(urls.map(skgifFetch)).then(responses => {
    if (responses.some(r => !r)) throw new Error(SKGIF_FAILED_MESSAGE);
    return responses;
  });

  // Writes the total into the title and reveals the page held by
  // holdSkgifPage() (if any), so count and results appear together.
  //scrive listedTotal (numero dei risultati da mostrare) nel titolo e rilascia la pagina
  //riempie search-total-count in html
  function showCount() {
    const countEl = document.getElementById(totalCountId);
    if (countEl) countEl.textContent = listedTotal;
    releaseSkgifPage();
  }

  // Page 1 of every source (needed anyway for the first page, and cached)
  // gives each source's total_items.
  //carica i totali di ogni fonte e calcola listedTotal
  function loadTotals() {
    if (sourceTotals) return Promise.resolve();
    return fetchAll(sources.map(src => pageUrl(src, 1))).then(responses => {
      sourceTotals = responses.map(skgifTotal);
      listedTotal = sourceTotals.reduce((a, b) => a + b, 0);
    });
  }

  // Global item range of `page` -> for each source it touches, the (at most
  // two) API pages covering it, then the exact slice of their items.
  //INTERVALLO DELLA PAGINA, calcola quali item mostrare in una pagina, CONCATENAZIONE DELLE FONTI NELLA STESSA PAGINA
  //GENERICA CHE FUNZIONA PER UNA O PIU FONTI
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
      parts.push(fetchAll(urls).then(responses => {
        const items = responses.flatMap(r => Array.isArray(r["@graph"]) ? r["@graph"] : []);
        const skip = from - (firstApiPage - 1) * pageSize;
        return items.slice(skip, skip + (to - from)); 
      }));
    });
    return Promise.all(parts).then(lists => lists.flat());
  }

  function fetchPage(page) { //funzione orchestratrice delle altre
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = "<div class='col-12 skgif-page-loading'>Loading the results<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span></div>";
    }

    loadTotals() //chiama load total che calcola i numeri
      .then(() => itemsForPage(page))
      .then(pageItems => {
        const seen = new Set();
        const items = pageItems.filter(item => {
          const key = dedupeKey(item); //elimina duplicati nella stessa pagina
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const ranked = config.rankItems ? config.rankItems(items) : items;
        _render(container, ranked, page, listedTotal); //chiama render (creazione template) in cui LISTEDTOTAL= totalitems
        showCount(); //mostra numero di risorse e rilascia il template
        // The API is slow on URLs it hasn't served before (20-60 s, then
        // cached): load the next page in the background while this one is
        // read, so Next usually finds it in _skgifResponseCache.
        if (page * pageSize < listedTotal) itemsForPage(page + 1).catch(() => {}); //precarica la pagina successiva  se esiste una pagina successiva, la carica in background
      })
      .catch(error => {
        console.error("SKG-IF search failed:", error);
        if (container) container.innerHTML = `<div class="col-12"><div class="alert alert-danger">${_skgifEscape(error.message)}</div></div>`;
        releaseSkgifPage(); //nessun conteggio nel titolo: la ricerca non è riuscita
      });
  }

  function _render(container, items, page, totalItems) { //calcola il numero delle pagine in cui dividere i risultati usando listedtotal
    if (!container) return;

    if (items.length === 0) { // se non ci sono items
      _skgifShowMessage(config.emptyMessage || 'No results found.', containerId);
      return;
    }

    // container is already a Bootstrap .row (see aut_free_text.html); an
    // extra nested .row here caused the horizontal scrollbar bug (negative
    // row margins compounding), so we render the .col-* items directly.
    let html = items.map(config.renderItem).join(''); //(html= rendering delle cards)

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize)); //calcolo numero pagine
    const btn = (target, label, cls) => //creazione pulsanti
      `<button type="button" class="btn ${cls} skgif-page-btn" data-skgif-page="${target}" data-skgif-container="${containerId}">${label}</button>`;
    const prevBtns = page > 1
      ? `<span class="skgif-page-group">${btn(1, '&laquo; First', 'btn-outline-secondary')}${btn(page - 1, '&lsaquo; Previous', 'btn-outline-secondary')}</span>`
      : `<span></span>`;
    const nextBtns = page < totalPages
      ? `<span class="skgif-page-group">${btn(page + 1, 'Next &rsaquo;', 'btn-outline-primary')}${btn(totalPages, 'Last &raquo;', 'btn-outline-primary')}</span>`
      : `<span></span>`;
    // Typing a page number + Enter jumps there (handled by the delegated
    // listener next to the click one).
    const pageInput = totalPages > 1
      ? `<input type="number" class="form-control form-control-sm skgif-page-input" min="1" max="${totalPages}" value="${page}" aria-label="Go to page" data-skgif-container="${containerId}">`
      : `${page}`;

    //Costruisce la barra di paginazione e la aggiunge all'HTML (contenente già le cards)
    html += `
      <div class="col-12">
        <nav class="skgif-pagination" aria-label="Search results pages">
          ${prevBtns}
          <span class="skgif-page-info">Page ${pageInput} of ${totalPages}</span>
          ${nextBtns}
        </nav>
      </div>`;

    container.innerHTML = html; //la funzione render riempie in html search-results-container con template html qui generato (cards + barra sotto)

  }

  // Changing page (buttons or page input) scrolls back to the start of the
  // results - the title card with the count if there is one, else the
  // results container - so the new page is read from its first item instead
  // of from wherever the (shorter, while loading) list left the scroll.
  // Focus moves there too, for keyboard/screen reader users. Not done on the
  // first load (search()), where the page is already at the top.
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
  // The .hf files have no #sparql block (lucinda.js renders the template
  // right away): the search keeps LUCINDA's loading banner until the total
  // and the first results are ready, then shows them at once.
  return {
    search: () => {
      holdSkgifPage(); //trattiene caricamento template finchè non arrivano i dati
      fetchPage(1);
    }
  };
}

// Page changes: one delegated listener for the buttons and one for the
// page-number input (Enter), shared by every paginated container.
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
//AGGIUSTARE QUELLO CHE UTENTE SCRIVE NELLA BARRA DI RICERCA
// Value of a parameter of the page URL as LUCINDA gives it to #callfun
// (args[1] = Lucinda.data.main, where a value can be an array), decoded:
// search_query of "author/...", "document/...", "venue/...", id of
// "doc_cit/br/{id}" / "doc_ref/br/{id}".
function _skgifUrlParam(lucinda_main_data, key) { //legge dall'indirizzo della pagina la parola cercata e ne prende il valore = è il valore da cercare --> ne segue preparazione specifica del valore da chiedere all'api in base al tipo di risorsa
  let value = (lucinda_main_data || {})[key] || "";
  value = String(Array.isArray(value) ? value[0] : value);
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

// Plain message in place of the results (e.g. empty query). // mostra una frase al posto dei risultati
function _skgifShowMessage(text, containerId = 'search-results-container') {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = `<div class="col-12"><p>${text}</p></div>`;
}

// Makes a user-typed value safe for a cf.search.* filter, before
// encodeURIComponent(): the characters that break the request become spaces
// (all verified live on 2026-09-28, on both /products and /persons):
//   ,  separates two filters (AND): "semantic web, ontology" -> HTTP 422
//   "  '  "\"semantic web\"", "alzheimer's disease", "D'Angelo" -> 502
//      (with a space instead: "alzheimer s disease" finds the "Alzheimer's
//      Disease" titles and "D Angelo" the 10999 "D'Angelo", same as the
//      typographic apostrophe)
//   \  -> 500;  *  "semantic web*" -> 502 (removed on names too, for
//      consistency, although there "Peroni*" works as a prefix search)
//   &  #  the server decodes the filter again and cuts the query there:
//      "semantic & web" and "semantic # web" search just "semantic"
//   %  "semantic 100% web" -> 404
// The rest of the punctuation (: ; ( ) ? ! / - + = ~ ^ |) is ignored by the
// API ("semantic: web", "semantic (web)", ... all return the same 7520 as
// "semantic web"; "Garcia-Hierro" = "Garcia Hierro"), so it's kept. Also
// normalized to NFC: accents as single composed characters, like the API
// data (decomposed "Nicolò" = o + U+0300 returns 1 person instead of 7082).
function _skgifSafeTerm(s) { //sostituisce con uno spazio i caratteri che mandano in errore la richiesta
  return String(s || "").normalize('NFC')
    .replace(/[,"'\\*&#%]/g, ' ') //caratteri che rompono la richiesta
    .split(/\s+/).filter(Boolean).join(' ');
}

// RICERCA PER IDENTIFICATIVO (pannello ID della home: schema dalla tendina + valore)
// The home ID panel sends "<category>/" + encodeURIComponent("scheme=doi&id=10.1/...")
// (see skgifSearch() in home.js). {scheme, id} of such a search_query, null
// for a free-text one.
function _skgifIdQuery(query) {
  if (!query.startsWith('scheme=')) return null;
  const params = new URLSearchParams(query);
  return { scheme: (params.get('scheme') || "").toLowerCase(), id: (params.get('id') || "").trim() };
}

// Filter field holding the identifier value: identifiers.id on products,
// persons and organisations, identifiers.value on venues (the other one
// returns HTTP 422 there).
const SKGIF_ID_FIELD = { products: 'identifiers.id', persons: 'identifiers.id', organisations: 'identifiers.id', venues: 'identifiers.value' };

// Cards of every record of `entity` with that identifier (the same ID can
// belong to several records: 137 venues share an ISSN, 10 persons an ORCID).
// Every scheme of the SKG-IF list is searched as typed, also the ones OC has
// no data for (ror, viaf, eissn, ...): the API answers 404 = 0 results.
// omid has no filter: /<entity>/<full OMID> returns the record itself.
function _skgifIdSearch(entity, idQuery, renderItem) {
  const { scheme, id } = idQuery;
  const label = document.getElementById('search-query-label');
  if (label) label.textContent = `${scheme}: ${id}`; //titolo: "doi: 10.1/..."

  if (!scheme || !id) {
    _skgifShowMessage('No results found.');
    return;
  }
  if (scheme === 'omid') return _skgifShowByOmid(entity, id, renderItem);

  createSkgifPaginatedSearch({
    sources: [`${SKGIF_API}/${entity}?filter=identifiers.scheme:${encodeURIComponent(scheme)},${SKGIF_ID_FIELD[entity]}:${encodeURIComponent(id)}`],
    renderItem
  }).search();
}

// OMID search: /<entity>/<full OMID> returns a single record, not a search
// page (no total_items), so the card is shown here instead of by the
// paginator. Accepts "br/0601...", "omid:br/0601..." or the full w3id URL.
// 404 = no record of that entity with that OMID.
function _skgifShowByOmid(entity, omid, renderItem) {
  const shortOmid = omid.replace(/^omid:/i, '').replace(/^https?:\/\/w3id\.org\/oc\/meta\//i, '');
  const container = document.getElementById('search-results-container');
  const countEl = document.getElementById('search-total-count');
  holdSkgifPage();
  skgifFetch(`${SKGIF_API}/${entity}/https://w3id.org/oc/meta/${shortOmid}`)
    .then(data => {
      if (!data) return _skgifShowMessage(SKGIF_FAILED_MESSAGE);
      const record = (data['@graph'] || [])[0];
      if (countEl) countEl.textContent = record ? 1 : 0;
      if (record) container.innerHTML = renderItem(record);
      else _skgifShowMessage('No results found.');
    })
    .finally(releaseSkgifPage);
}

// FUNZIONI CHE preparano quello che si vede sulla pagina
// Escapes text coming from the API before putting it into HTML.
// Se un titolo che arriva dall'API contiene, per esempio, <b>, il browser non lo mostra: lo interpreta come un comando e la pagina può rompersi. Quindi utente vede il titolo così com'è a il browser non si rompe
function _skgifEscape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Short OMID ("br/06011277533", "ra/0614010840729") of a SKG-IF
// local_identifier ("https://w3id.org/oc/meta/br/06011277533"), "" if none.
//l'API restituisce l'identificativo lungo (https://w3id.org/oc/meta/br/06011277533), ma a noi serve solo la parte finale (br/06011277533) per costruire i link interni. Quindi accorcia il link.
function _skgifOmid(localId) {
  const match = String(localId || "").match(/\/meta\/([a-z]{2}\/[\w\d]+)$/);
  return match ? match[1] : "";
}

// External page of each identifier scheme: doi...omid are the same targets
// as Pietro's createIdLinks() in api_search(); the others (SILVIA, SKG-IF)
// cover every scheme of the SKG-IF list, plus jid (J-STAGE, present in OC),
// each on its official resolver or, where there is none, on the reference
// registry of that kind of ID (all checked live on 2026-10-09):
//   pmcid     PubMed Central (the old www.ncbi.nlm.nih.gov/pmc/ URLs now
//             end on a 404)
//   crossref  Crossref participation report of the member (api.crossref.org
//             is JSON only)
//   isbn      WorldCat (OCLC), there is no ISBN resolver
//   eissn / lissn  ISSN Portal, as issn
//   ivoid     GAVO IVOID resolver of the IVOA registry
//   spase     SPASE metadata landing pages (spase:// -> https://spase-metadata.org/)
//   urn       nbn-resolving.org (Deutsche Nationalbibliothek) for URN:NBN;
//             other URNs have no general resolver -> no link
//   url / w3id  the address itself (only http/https)
//   opendoar  Jisc Sherpa OpenDOAR record
// A function returning "" means no link for that value. The value goes into
// the URL through _skgifUrlPart() (? and # would otherwise cut it).
//la rubrica dei siti: dai il valore e ti restituisce l'indirizzo completo
const _skgifUrlPart = v => encodeURI(v).replace(/[?#]/g, encodeURIComponent);
const _skgifHttpUrl = v => /^https?:\/\//i.test(v) ? encodeURI(v) : "";
const SKGIF_ID_URLS = {
  doi: v => `https://doi.org/${_skgifUrlPart(v)}`,
  pmid: v => `https://pubmed.ncbi.nlm.nih.gov/${_skgifUrlPart(v)}/`,
  issn: v => `https://portal.issn.org/resource/ISSN/${_skgifUrlPart(v)}`,
  openalex: v => `https://openalex.org/${_skgifUrlPart(v)}`,
  orcid: v => `https://orcid.org/${_skgifUrlPart(v)}`,
  omid: v => `https://w3id.org/oc/meta/${_skgifUrlPart(v)}`,
  pmcid: v => `https://pmc.ncbi.nlm.nih.gov/articles/${_skgifUrlPart(v)}/`, // SILVIA (SKG-IF)
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

// Order the identifiers are listed in (the API returns them in no fixed
// order); omid last, as in Pietro's cards. Unknown schemes go before omid.
//si decide ordine di comparsa degli id (devono comparire sempre nello stesso ordine)
const SKGIF_ID_ORDER = ['doi', 'pmid', 'pmcid', 'arxiv', 'isbn', 'issn', 'openalex'];

function _skgifIdRank(scheme) {
  if (scheme === 'omid') return SKGIF_ID_ORDER.length + 1; //omid riceve sempre il numero più alto, quindi finisce in fondo.
  const i = SKGIF_ID_ORDER.indexOf(scheme);
  return i === -1 ? SKGIF_ID_ORDER.length : i;
}

// "scheme:value", linked to its external page when the scheme has one.
//crea un singolo link
function _skgifIdLink(scheme, value) {
  const s = String(scheme || "").toLowerCase(); //mette prefisso in minuscolo
  const label = _skgifEscape(`${s}:${value}`); //prepara testo da mostrare
  const url = SKGIF_ID_URLS[s] ? SKGIF_ID_URLS[s](String(value)) : ""; //cerca prefisso nella rubrica
  return url
    ? `<a href="${_skgifEscape(url)}" target="_blank" class="text-dark text-decoration-none">${label}</a>` //link per aprire id in una nuova scheda
    : label;
}

// SKG-IF identifiers array (+ the OMID, if given) -> "doi:... • openalex:... • omid:br/...".
//crea l'intera riga degli identificativi mettendo insieme le funzioni precedenti
function _skgifIdList(identifiers, omid) {
  const ids = (Array.isArray(identifiers) ? identifiers : [])
    .filter(i => i && i.scheme && i.value)
    .map(i => ({ scheme: String(i.scheme).toLowerCase(), value: i.value }));
  if (omid) ids.push({ scheme: 'omid', value: omid });
  return ids
    .map((id, i) => ({ id, i }))
    .sort((a, b) => _skgifIdRank(a.id.scheme) - _skgifIdRank(b.id.scheme) || a.i - b.i)
    .map(x => _skgifIdLink(x.id.scheme, x.id.value))
    .join(' • '); //puntino per separare
}

// Agents of a product with one role (author, editor, publisher), from its
// contributions: [{ role, by: { name, family_name, given_name,
// local_identifier, identifiers }, rank }], used by the document cards
// (authors) and by the venue cards (publisher, editor). By rank, separated
// by " • " as in Pietro's cards; the name links to agentUrl(<short OMID>),
// the ORCID follows in brackets when present. "" if there are none.
//logica per recuperare nomi autori per i documenti e publisher/editor nelle riviste
function _skgifAgents(contributions, role, agentUrl) {
  return (Array.isArray(contributions) ? contributions : [])
    .filter(c => c && c.role === role && c.by) //tiene le voci con il ruolo specificato
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) //ordina per rank
    .map(c => { //costruzione del nome linkabile + orcid tra parentesi
      const by = c.by;
      const name = _skgifEscape((by.name || "").trim()
        || [by.family_name, by.given_name].filter(Boolean).join(', ')
        || 'Unknown Name');
      const agentOmid = _skgifOmid(by.local_identifier);
      const orcid = (Array.isArray(by.identifiers) ? by.identifiers : []).find(i => i.scheme === 'orcid')?.value;
      let html = agentOmid
        ? `<a href="${agentUrl(agentOmid)}" target="_blank" class="text-dark text-decoration-none">${name}</a>`
        : `<span>${name}</span>`;
      if (orcid) html += ` (<a href="https://orcid.org/${_skgifEscape(orcid)}" target="_blank">${_skgifEscape(orcid)}</a>)`;
      return html;
    })
    .join(' • ');
}

/*
################################################################################
# 3. RICERCA AUTORI (aut_free_text)
################################################################################
*/
// ---aut_free_text (SKG-IF)---
// #callfun args are (per the convention documented near ocapi_citations()
// above): args[1] = Lucinda.data.main (has search_query), args[2] = this
// block's own id.
//
// The home page has separate given name / family name fields and the ID
// panel, so search_query is a URL-encoded query string (see home.js):
//   given=Silvio&family=Peroni  -> cf.search.given_name AND cf.search.family_name
//   family=Peroni               -> cf.search.family_name only (given only alike)
//   scheme=orcid&id=0000-...    -> identifiers.id, see _skgifIdSearch()
// cf.search.* matches the beginning of words, so an abbreviated field
// ("Peroni" + "S", "Silvio" + "P") already works with no extra logic.
// SKG-IF returns full person metadata (name, ORCID, ...) in the search
// response itself, so there's no need for OpenCitations Meta at all.
//
// The name is searched exactly as typed: the API matches accent-sensitively
// ("Nicolò" doesn't find "Nicolo" and vice versa), and no other spelling is
// tried (prof's decision).
//
// Flow: _authorSearchFields() -> createSkgifPaginatedSearch() with
// _rankAuthorsByQuery() and _renderAuthorCard() (defined below).
function api_search_author_skgif(...args) { //Coordina la ricerca autori
  const query = _skgifUrlParam(args[1], 'search_query');
  const idQuery = _skgifIdQuery(query); //ricerca per identificativo (pannello ID)
  if (idQuery) return _skgifIdSearch('persons', idQuery, _renderAuthorCard);

  const fields = _authorSearchFields(query); //legge cosa ha scritto utente, prende il testo dall'indirizzo e lo divide nelle caselle given e family tramite authorsearchfield

  const label = document.getElementById('search-query-label'); //titolo leggibile: "Given name: ... · Family name: ..."
  if (label) {
    label.textContent = [fields.given && `Given name: ${fields.given}`, fields.family && `Family name: ${fields.family}`]
      .filter(Boolean).join(' · ');
  }

  if (!fields.given && !fields.family) { // controlla che ci sia qualcosa da cercare
    _skgifShowMessage('No results found.');
    return;
  }

  //costruzione richiesta da mandare all'api: un filtro per ogni campo compilato
  const apiTerm = s => encodeURIComponent(_skgifSafeTerm(s));
  const filters = [];
  if (fields.given) filters.push(`cf.search.given_name:${apiTerm(fields.given)}`); //nome
  if (fields.family) filters.push(`cf.search.family_name:${apiTerm(fields.family)}`); //cognome

  createSkgifPaginatedSearch({ //avvia paginator
    sources: [`${SKGIF_API}/persons?filter=${filters.join(',')}`], //Nome e cognome dove virgola = E
    rankItems: items => _rankAuthorsByQuery(items, fields), //come ordinare
    renderItem: _renderAuthorCard  //come disegnare le cards
  }).search(); //consegna tutto al paginator che manda le richieste e gestisce le pagine
}

// ---aut_free_text (SKG-IF) FUNZIONI DI SUPPORTO---
// Reads {given, family} from the decoded search_query ("given=...&family=...",
// see home.js). Names are normalized to NFC (accents as single composed
// characters, like the API data).
function _authorSearchFields(query) {
  if (!query.includes('=')) { //testo libero (es. "author/carfagna"): ultima parola = cognome, le altre = nome
    const words = query.normalize('NFC').trim().split(/\s+/).filter(Boolean);
    return { given: words.slice(0, -1).join(' '), family: words[words.length - 1] || "" }; //i due campi given e family
  }
  const params = new URLSearchParams(query);
  const get = key => (params.get(key) || "").normalize('NFC').trim();
  return { given: get('given'), family: get('family') };
}

// ---aut_free_text (SKG-IF)---
// Lowercased, single-spaced name, used to compare names from the API with
// the query. Apostrophes (' and ’), hyphens and the characters that
// _skgifSafeTerm() removes count as spaces, as they do for the API:
// "D'Angelo" = "D Angelo", "Garcia-Hierro" = "Garcia Hierro".
function _normName(s) {
  return String(s || "").toLowerCase()
    .replace(/[,"'\\*&#%\u2019-]/g, ' ') //apostrofi, trattini e caratteri tolti dagli URL
    .split(/\s+/).filter(Boolean).join(' ');
}

// ---aut_free_text (SKG-IF)---
// cf.search.* also returns partial matches ("Peroni" finds "Peronin" too),
// so each page is stable-sorted by how many of the filled fields match
// exactly: e.g. family "Peroni" + given "S" -> the Peroni first, then
// "Peronin".
function _rankAuthorsByQuery(items, fields) { //match esatti in cima e parziali sotto assegnando a ogni persona un punteggio di errore
  const same = (a, b) => _normName(a) === _normName(b);
  const score = person =>
    (fields.family && !same(person.family_name, fields.family) ? 1 : 0) +
    (fields.given && !same(person.given_name, fields.given) ? 1 : 0);
  return items
    .map((item, i) => ({ item, i, s: score(item) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map(x => x.item);
}

// ---aut_free_text (SKG-IF)---
// HTML card for one person of the results page.
function _renderAuthorCard(person) {
  const omid = _skgifOmid(person.local_identifier);
  if (!omid) return "";

  const identifiers = Array.isArray(person.identifiers) ? person.identifiers : [];
  const orcid = _skgifEscape(identifiers.find(i => i.scheme === "orcid")?.value || "");

  const fullname = (person.name || "").trim()
    || `${person.given_name || ""} ${person.family_name || ""}`.trim()
    || "Unknown Name";

  const orcidHtml = orcid
    ? `<a href="https://orcid.org/${orcid}" target="_blank" class="text-dark text-decoration-none">${orcid}</a>`
    : '<span class="text-muted p-4"><em>No ORCID found</em></span>';

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}" target="_blank">${_skgifEscape(fullname)}</a>
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
// ---doc_free_text (SKG-IF)---
// Replaces Pietro's search_ids SPARQL block (bif:contains on the title,
// LIMIT 100) + api_search() (Meta REST API in batches of 20 OMIDs): a single
// SKG-IF /products?filter=cf.search.title:... request already returns every
// field of the card (title, authors with ORCID, identifiers, publication
// date, venue), and total_items is the real number of matches, not capped
// at 100. Pagination is the shared createSkgifPaginatedSearch() (section 1)
// with one source: the query as typed.
//
// #callfun args: args[1] = Lucinda.data.main (has search_query), see
// api_search_author_skgif().
//
// Characters that break the request (commas, quotes, apostrophes, &, #, ...)
// are replaced with spaces by _skgifSafeTerm() (section 2), which also
// normalizes the query to NFC.
function api_search_doc_skgif(...args) { //Coordina la ricerca documenti
  const rawQuery = _skgifUrlParam(args[1], 'search_query');
  const idQuery = _skgifIdQuery(rawQuery); //ricerca per identificativo (pannello ID)
  if (idQuery) return _skgifIdSearch('products', idQuery, _renderDocumentCard);

  const query = _skgifSafeTerm(rawQuery); //NFC + caratteri che rompono la richiesta = lettura e pulizia della query prendendo il valore cercato dall'url della pagina tramite skgifurlparam e togliendo i caratteri che rompono l'api tramite skgifsafeterm
  const label = document.getElementById('search-query-label');
  if (label) label.textContent = query;
  if (!query) { //se la query è vuota
    _skgifShowMessage('No results found.');
    return;
  }

  createSkgifPaginatedSearch({ //avvio della ricerca
    sources: [`${SKGIF_API}/products?filter=cf.search.title:${encodeURIComponent(query)}`], //una sola richiesta, la query così come è scritta
    renderItem: _renderDocumentCard //come disegnare le cards
  }).search(); //chiamiamo il paginator
}

// ---doc_free_text (SKG-IF)---
// Title of a product: "none" is the language-less title, else the first
// language found (the API groups the titles by language). Plain text.
function _skgifProductTitle(product) {
  const titles = product.titles || {};
  return (titles.none || Object.values(titles)[0] || [])[0] || 'No title'; //L'API raggruppa i titoli per lingua. || vuol dire se no
}

// Publication date of a product, from its manifestations, escaped. The date
// is a full timestamp ("2024-01-01T00:00:00"): only the date part is shown.
function _skgifProductDate(product) {
  const manifestations = Array.isArray(product.manifestations) ? product.manifestations : [];
  const pubDate = manifestations.map(m => m?.dates?.publication?.[0]).find(Boolean);
  return pubDate ? _skgifEscape(String(pubDate).slice(0, 10)) : 'Unknown'; //dalla lettura della data in json tiene conto solo dei primi 10 caratteri
}

// ---doc_free_text (SKG-IF)---
// HTML card for one product of the results page: same layout and links as
// Pietro's api_search() cards (links are relative, see the author card).
// Also used by the citation/reference lists (section 5).
function _renderDocumentCard(product) {
  const omid = _skgifOmid(product.local_identifier); //prende omid corto
  if (!omid) return ""; //senza omid non risegna la card del documento

  const title = _skgifProductTitle(product);

  // Authors (publishers etc. are left out) -> author page. Usa la funzione skgifagents solo per il ruolo author per recuparare dalle ricerche del documento gli autori e scriverli nelle cards con la giusta resa
  const formattedAuthors = _skgifAgents(product.contributions, 'author', authorOmid => `browser.html?value=${authorOmid}`)
    || 'Unknown';

  // Date and venue come from the manifestation.
  const manifestations = Array.isArray(product.manifestations) ? product.manifestations : [];
  const formattedDate = _skgifProductDate(product);

  // Source: venue title -> venue page, its identifiers (without omid) in brackets.
  let formattedSource = "";
  const venue = manifestations.map(m => m?.biblio?.in).find(v => v && v.name);
  if (venue) {
    const venueOmid = _skgifOmid(venue.local_identifier);
    const venueTitle = `<i>${_skgifEscape(venue.name)}</i>`; //titolo della rivista in corsivo
    const titleHtml = venueOmid
      ? `<a href="browser.html?value=${venueOmid}" target="_blank" class="text-dark text-decoration-none">${venueTitle}</a>`
      : venueTitle;
    const venueIds = _skgifIdList(venue.identifiers); //lista degli ids del venue
    formattedSource = venueIds ? `${titleHtml} (${venueIds})` : titleHtml;
  }

  const formattedIds = _skgifIdList(product.identifiers, omid) || 'No ID';

  const ocRecordUrl = `browser.html?value=${omid}`; //titolo
  const refUrl = `browser.html?value=doc_ref/${omid}`;  // bottone "Go to References"
  const citUrl = `browser.html?value=doc_cit/${omid}`; // bottone "Go to Citations"

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="${ocRecordUrl}" target="_blank">${_skgifEscape(title)}</a>
          </h5>
          <hr>

          <div class="mb-2">
            <span class="metadata-label fw-bold">Authors:</span><br>
            <span>${formattedAuthors}</span>
          </div>

          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${formattedIds}</span>
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
        </div>

        <div class="d-flex justify-content-end px-3 pb-2 gap-2">
          <a href="${refUrl}" class="btn btn-sm" target="_blank">Go to References</a>
          <a href="${citUrl}" class="btn btn-sm" target="_blank">Go to Citations</a>
        </div>
      </div>
    </div>`;
}

/*
################################################################################
# 5. CITAZIONI E RIFERIMENTI (doc_citations, doc_references)
################################################################################
*/
// ---doc_citations---doc_references (SKG-IF)---
// Replace Pietro's SPARQL on the Index (cito:hasCitingEntity /
// cito:hasCitedEntity) + load_metadata_async() (Meta REST API in batches of
// 20 OMIDs) with one paginated /products request, using two filters of the
// API (same counts as the Index citation-count / reference-count):
//   cf.cites:<omid>     -> products that cite the document   (citations)
//   cf.cited_by:<omid>  -> products cited by the document    (references)
// The value must be the full OMID URL ("cf.cites:br/..." returns 0).
// Cards are the same as the document search (_renderDocumentCard()).
//
// #callfun args: args[1] = Lucinda.data.main (has the id of
// "doc_cit/br/{id}" / "doc_ref/br/{id}"), see api_search_author_skgif().
function api_doc_citations_skgif(...args) {
  _skgifCitationList(args[1], 'cf.cites', 'No citations found.'); //filtro citazioni
}

function api_doc_references_skgif(...args) {
  _skgifCitationList(args[1], 'cf.cited_by', 'No references found.'); //fitro riferimenti
}

function _skgifCitationList(lucinda_main_data, filter, emptyMessage) {
  const id = _skgifUrlParam(lucinda_main_data, 'id').trim(); //legge ID del documento
  if (!id) {
    _skgifShowMessage(emptyMessage);
    return;
  }

  const omidUrl = `https://w3id.org/oc/meta/br/${id}`; //costruisce omid completo che è quello che ci serve in questo caso
  createSkgifPaginatedSearch({ //manda richiesta
    sources: [`${SKGIF_API}/products?filter=${filter}:${encodeURIComponent(omidUrl)}`],
    renderItem: _renderDocumentCard, //mostra card
    emptyMessage
  }).search();
}

/*
################################################################################
# 6. RICERCA RIVISTE (venue_free_text)
################################################################################
*/
// ---venue_free_text (SKG-IF)---
// Replaces Pietro's search_ids SPARQL block (bif:contains on the title of
// fabio:Journal / fabio:Series, no longer supported by the Meta endpoint) +
// api_search_venue() (Meta REST API in batches of 20 OMIDs) with one
// paginated /venues request:
//   venue/<text>             -> cf.search.name:<text>
//   venue/scheme=issn&id=... -> ID panel, see _skgifIdSearch()
// Every venue type is returned (journal, book, conference, other...), as
// agreed with the prof (Pietro had journals only); the type is shown on
// each card. SKG-IF venues have only name, type and identifiers: Pietro's
// publisher/editor are read from the same OMID asked to /products (see
// _loadVenueAgents()); his date is always empty on Meta journal records.
// Special characters as in the document search.
//
// #callfun args: args[1] = Lucinda.data.main (has search_query), see
// api_search_author_skgif().
function api_search_venue_skgif(...args) { //legge la query e capisce che tipo di ricerca è
  const query = _skgifUrlParam(args[1], 'search_query');
  const idQuery = _skgifIdQuery(query); //ricerca per identificativo (pannello ID)
  if (idQuery) return _skgifIdSearch('venues', idQuery, _renderVenueCard);

  const name = _skgifSafeTerm(query); //ricerca per nome, il testo viene pulito con _skgifSafeTerm

  //titolo della pagina
  const label = document.getElementById('search-query-label');
  if (label) label.textContent = name;

  if (!name) { //se non c'è niente da cercare
    _skgifShowMessage('No results found.');
    return;
  }

  //costruzione richiesta
  createSkgifPaginatedSearch({
    sources: [`${SKGIF_API}/venues?filter=cf.search.name:${encodeURIComponent(name)}`], //una sola richiesta, il nome così come è scritto, tutti i type
    renderItem: _renderVenueCard //resa cards
  }).search();//paginatore
}

// ---venue_free_text (SKG-IF)---
// HTML card for one venue of the results page: same layout and title link
// as Pietro's api_search_venue() cards, plus the venue type. Publisher and
// editor go in the empty .venue-agents box, filled by _loadVenueAgents()
// when its request ends (the card is in the page by then).
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
            <a href="browser.html?value=${omid}" target="_blank">${_skgifEscape(venue.name || 'Unknown Title')}</a>
          </h5>
          <hr>
          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${_skgifIdList(venue.identifiers, omid)}</span>
          </div>
          ${type}
          <div class="venue-agents" data-venue-omid="${omid}"></div>
        </div>
      </div>
    </div>`;
  _loadVenueAgents(omid);
  return html;
}

// ---venue_free_text (SKG-IF)---
// Publisher and editor of a venue. /venues has no contributions, but the
// venue OMID is also a product: /products/<venue OMID> returns the journal
// with its contributions (role publisher / editor), as Pietro's Meta
// record. One request per venue, through skgifFetch() (cached, so going
// back to a page doesn't repeat it). A failed request leaves the box empty.
// The names link to the agent's OMID page (Pietro linked the
// w3id.org/oc/meta/ar/ page, the role, not the agent), until there is a
// page for organisations.
//Nelle card di Pietro comparivano anche Publisher (editore) ed Editor. Però l'API /venues restituisce solo nome, tipo e identificativi: niente editore, niente editor.
//In OpenCitations una rivista è registrata anche come prodotto, con lo stesso OMID. Chiedendo a /products quell'OMID, si ottiene la rivista con le sue contributions, dentro le quali ci sono publisher ed editor.
function _loadVenueAgents(omid) {
  skgifFetch(`${SKGIF_API}/products/https://w3id.org/oc/meta/${omid}`).then(data => { //seconda richiesta per ogni rivista mostrata per recuperaree editor e publisher
    const contributions = (data?.['@graph'] || [])[0]?.contributions; //dal prodotto prende le contributions
    const row = (role, label) => {
      const agents = _skgifAgents(contributions, role, agentOmid => `https://w3id.org/oc/meta/${agentOmid}`); //uso di skgifagents due volte: una volta per editor e una per publisher
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
// ---org_free_text (SKG-IF)---
// New search (Pietro had none), one /organisations request:
//   organisation/<text>                  -> cf.search.name:<text> (paginated)
//   organisation/scheme=crossref&id=...  -> ID panel, see _skgifIdSearch()
// SKG-IF organisations on OC have only name, OMID and, for some, a Crossref
// member id (identifiers [{scheme: crossref, value: "78"}]). Every record is
// shown as the API returns it: the same publisher is recorded once per
// article in Meta, so a name can have many identical records (to discuss).
// Special characters as in the document search.
//
// #callfun args: args[1] = Lucinda.data.main (has search_query), see
// api_search_author_skgif().
function api_search_org_skgif(...args) {
  const query = _skgifUrlParam(args[1], 'search_query');
  const idQuery = _skgifIdQuery(query); //ricerca per identificativo (pannello ID)
  if (idQuery) return _skgifIdSearch('organisations', idQuery, _renderOrgCard);

  const name = _skgifSafeTerm(query);
  const label = document.getElementById('search-query-label');
  if (label) label.textContent = name;

  if (!name) {
    _skgifShowMessage('No results found.');
    return;
  }

  createSkgifPaginatedSearch({
    sources: [`${SKGIF_API}/organisations?filter=cf.search.name:${encodeURIComponent(name)}`],
    renderItem: _renderOrgCard
  }).search();
}

// ---org_free_text (SKG-IF)---
// HTML card for one organisation of the results page, same layout as the
// venue cards. The name links to the organisation's OMID page, as the
// publishers in the venue cards, until there is an organisation page.
function _renderOrgCard(org) {
  const omid = _skgifOmid(org.local_identifier);
  if (!omid) return "";

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="https://w3id.org/oc/meta/${omid}" target="_blank">${_skgifEscape(org.name || 'Unknown Name')}</a>
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
// ---new_ci_browser (SKG-IF)---
// Replaces Pietro's two SPARQL blocks (meta2 on Meta for the two documents,
// index2 on the Index for their references/citations lists, intersected in
// post_ocindex_call_2()) with SKG-IF requests, all in parallel. An OCI is
// "<citing OMID>-<cited OMID>" (numbers of two br/ OMIDs, as pre_oci() split it):
//   /products/<full OMID> x 2              -> the citing and cited cards
//   cf.cited_by:<OMID> / cf.cites:<OMID>   -> References / Citations of each
//                                             (total_items, page_size=1)
//   cf.cited_by:<citing>,cf.cited_by:<cited> -> "Cited by Both": documents
//                                             cited by both (AND of the filters)
//   cf.cites:<citing>,cf.cites:<cited>     -> "Citing Both": documents citing both
// Checked against the Index on 2026-10-09: same counts and intersections
// (Citations can be 1 more: SKG-IF also has a few citing preprints without
// DOI that the Index doesn't list). The citation exists if the cited OMID is
// in the citing's related_products.cites; if not, a warning says so (the two
// documents are still shown).
// ON HOLD (to discuss with the prof): the two "Citations per year" charts
// (SKG-IF has no date filter: every citing product would have to be
// downloaded, 50 per page) and the citation's own metadata (creation,
// timespan, journal/author self-citation: only in the Index API).
//
// #callfun args: args[1] = Lucinda.data.main (has the oci of "ci/{oci}"),
// see api_search_author_skgif().
function api_citation_record_skgif(...args) {
  const oci = _skgifUrlParam(args[1], 'oci').trim().replace(/^oci:/i, '');
  const ociEl = document.getElementById('ci-oci');
  if (ociEl) ociEl.textContent = `ci/${oci}`; //titolo: l'OCI, come nella pagina di Pietro

  const parts = oci.match(/^(\d+)-(\d+)$/); //OCI = omid del citing - omid del cited
  if (!parts) return _skgifCiMessage(`"${oci}" is not a valid OCI (expected: two OMID numbers separated by "-").`, 'danger');
  const [, citing, cited] = parts;

  const omidUrl = id => `https://w3id.org/oc/meta/br/${id}`;
  const enc = id => encodeURIComponent(omidUrl(id));
  const product = id => skgifFetch(`${SKGIF_API}/products/${omidUrl(id)}`)
    .then(data => data ? ((data['@graph'] || [])[0] || {}) : null); //{} = nessun documento con quell'OMID, null = richiesta fallita
  const total = filter => skgifFetch(`${SKGIF_API}/products?filter=${filter}&page_size=1`)
    .then(data => data ? skgifTotal(data) : null); //solo il numero (total_items)

  holdSkgifPage(); //banner di caricamento finché non arrivano tutti i dati
  Promise.all([
    product(citing), product(cited),
    total(`cf.cited_by:${enc(citing)}`), total(`cf.cites:${enc(citing)}`),
    total(`cf.cited_by:${enc(cited)}`), total(`cf.cites:${enc(cited)}`),
    total(`cf.cited_by:${enc(citing)},cf.cited_by:${enc(cited)}`),
    total(`cf.cites:${enc(citing)},cf.cites:${enc(cited)}`)
  ]).then(([citingDoc, citedDoc, citingRefs, citingCits, citedRefs, citedCits, citedByBoth, citingBoth]) => {
    if (!citingDoc || !citedDoc) return _skgifCiMessage(SKGIF_FAILED_MESSAGE, 'danger');
    const missing = [[citingDoc, citing], [citedDoc, cited]].filter(([doc]) => !doc.local_identifier).map(([, id]) => `br/${id}`);
    if (missing.length) return _skgifCiMessage(`No document with OMID ${missing.join(' or ')} in OpenCitations.`, 'danger');

    const cites = citingDoc.related_products?.cites || [];
    if (!cites.includes(omidUrl(cited))) {
      _skgifCiMessage(`This citation is not in OpenCitations: br/${citing} does not cite br/${cited}.`, 'warning');
    }
    _fillCiResource('citing', citingDoc, citing, citingRefs, citingCits);
    _fillCiResource('cited', citedDoc, cited, citedRefs, citedCits);
    _setCiField('ci-cited-by-both', _ciCount(citedByBoth));
    _setCiField('ci-citing-both', _ciCount(citingBoth));
    document.getElementById('ci-record')?.classList.remove('d-none');
  }).finally(releaseSkgifPage);
}

// ---new_ci_browser (SKG-IF)---
// Fills the card of the citing or cited document (ids "<role>-<field>" in
// new_ci_browser.html), with the same content as Pietro's: title (-> the
// document page), authors (-> author page, ORCID in brackets), date,
// identifiers, OMID URI, References and Citations counts.
function _fillCiResource(role, product, id, refs, cits) {
  const uri = `https://w3id.org/oc/meta/br/${id}`;
  _setCiField(`${role}-title`, `<a href="browser.html?value=br/${id}" target="_blank">${_skgifEscape(_skgifProductTitle(product))}</a>`);
  _setCiField(`${role}-authors`, _skgifAgents(product.contributions, 'author', authorOmid => `browser.html?value=${authorOmid}`) || 'Unknown');
  _setCiField(`${role}-date`, _skgifProductDate(product));
  _setCiField(`${role}-ids`, _skgifIdList(product.identifiers, `br/${id}`) || 'No ID');
  _setCiField(`${role}-uri`, `<a href="${uri}" target="_blank">${uri}</a>`);
  _setCiField(`${role}-refs`, _ciCount(refs));
  _setCiField(`${role}-cits`, _ciCount(cits));
}

function _setCiField(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// A count, or "–" when its request failed (null).
function _ciCount(n) {
  return n === null ? '–' : String(n);
}

// Message above the record ('danger': nothing else to show, 'warning': the
// record is shown below it).
function _skgifCiMessage(text, type) {
  _setCiField('ci-message', `<div class="alert alert-${type} mb-4">${_skgifEscape(text)}</div>`);
}

/*
################################################################################
# 9. PROFILO AUTORE (new_ra_browser)
################################################################################
*/
// ---new_ra_browser (SKG-IF)---
// Replaces Pietro's two SPARQL blocks on Meta (author_meta: name, ORCID,
// other IDs; author_works: the works, LIMIT 1000, newest first) with:
//   /persons/<full OMID>                          -> name, ORCID, other identifiers
//   /products?filter=contributions.by.local_identifier:<full OMID>
//                                                 -> the works, paginated, each
//                                                    shown as Pietro's list item
//                                                    (_renderAuthorWorkItem());
//                                                    total_items is the
//                                                    Publications count
// Decided with the prof's student (2026-10-09), to reconsider after seeing it:
// - only the works of this record, as Pietro (the same person can have other
//   ra/ records with the same ORCID in OC: not merged here);
// - the filter has every role (author AND editor; Pietro: author only, e.g.
//   ra/0614010840729 = 115 vs 111): the cards where the person is an editor
//   have an "Editor" badge (_skgifRoleBadges()) next to the year;
// - the list is in the API's order (SKG-IF has no sort; Pietro's was by date).
// ON HOLD (to discuss with the prof): the "Publications per year" chart (no
// date filter or sort: every work would have to be downloaded, 50 per page).
//
// #callfun args: args[1] = Lucinda.data.main (has the id of "ra/{id}"), see
// api_search_author_skgif().
function api_author_record_skgif(...args) {
  const id = _skgifUrlParam(args[1], 'id').trim();
  const idEl = document.getElementById('ra-id');
  if (idEl) idEl.textContent = `ra/${id}`; //titolo: l'OMID, come nella pagina di Pietro

  const omidUrl = `https://w3id.org/oc/meta/ra/${id}`;
  const works = `${SKGIF_API}/products?filter=contributions.by.local_identifier:${encodeURIComponent(omidUrl)}`;
  const list = createSkgifPaginatedSearch({
    sources: [works],
    renderItem: product => _renderAuthorWorkItem(product, omidUrl), //voce come quella di Pietro + badge "Editor"
    emptyMessage: 'No publications found.'
  });

  holdSkgifPage(); //banner di caricamento finché non arrivano profilo e prima pagina
  Promise.all([
    skgifFetch(`${SKGIF_API}/persons/${omidUrl}`),
    skgifFetch(`${works}&page=1&page_size=${SKGIF_DEFAULT_PAGE_SIZE}`) //prima pagina in parallelo (in cache per list.search())
  ]).then(([data]) => {
    if (!data) return _skgifRaMessage(SKGIF_FAILED_MESSAGE);
    const person = (data['@graph'] || [])[0] || {};
    if (!person.local_identifier) return _skgifRaMessage(`No author with OMID ra/${id} in OpenCitations.`);

    const identifiers = Array.isArray(person.identifiers) ? person.identifiers : [];
    const orcid = identifiers.find(i => i.scheme === 'orcid')?.value;
    const name = `${person.given_name || ''} ${person.family_name || ''}`.trim() || (person.name || '').trim() || 'Unknown Author'; //come create_author_header_link()
    _setCiField('ra-name', `<a href="https://ldd.opencitations.net/meta/ra/${_skgifEscape(id)}" target="_blank" class="text-reset text-decoration-none">${_skgifEscape(name)}</a>`);
    _setCiField('ra-orcid', orcid
      ? `<a href="https://orcid.org/${_skgifEscape(orcid)}" target="_blank">${_skgifEscape(orcid)} <sup><i class="fas fa-external-link-alt small"></i></sup></a>`
      : 'No ORCID found');
    _setCiField('ra-ids', _skgifIdList(identifiers.filter(i => i.scheme !== 'orcid'), `ra/${id}`));
    document.getElementById('ra-record')?.classList.remove('d-none');
    list.search(); //lista paginata: riempie anche il contatore Publications e rilascia la pagina
  }).catch(() => _skgifRaMessage(SKGIF_FAILED_MESSAGE));
}

// ---new_ra_browser (SKG-IF)---
// One work of the list, with the same markup as Pietro's post_author_works():
// title (bold, -> document page), year badge on the right, identifiers below
// ("<strong>scheme</strong>:value", separated by " • "; like Pietro, without
// the OMID, which his query did not read as an identifier). Differences: the
// "Editor" badge (see above), and every identifier with an external page is
// linked (SKGIF_ID_URLS, section 2; Pietro: doi, pmid, openalex only).
function _renderAuthorWorkItem(product, agentOmid) {
  const omid = _skgifOmid(product.local_identifier);
  if (!omid) return "";
  const titles = product.titles || {};
  const title = (titles.none || Object.values(titles)[0] || [])[0] || 'Untitled Work';
  const date = _skgifProductDate(product);
  const year = date === 'Unknown' ? 'n.d.' : date.split('-')[0];
  const ids = (Array.isArray(product.identifiers) ? product.identifiers : [])
    .filter(i => i && i.scheme && i.value)
    .map(i => ({ scheme: String(i.scheme).toLowerCase(), value: String(i.value) }))
    .sort((a, b) => _skgifIdRank(a.scheme) - _skgifIdRank(b.scheme))
    .map(({ scheme, value }) => {
      const text = `<strong>${_skgifEscape(scheme)}</strong>:${_skgifEscape(value)}`;
      const url = SKGIF_ID_URLS[scheme] ? SKGIF_ID_URLS[scheme](value) : "";
      return url ? `<a href="${_skgifEscape(url)}" target="_blank" class="text-dark text-decoration-none">${text}</a>` : text;
    })
    .join(' • ');

  return `
    <div class="col-12">
      <div class="list-group-item p-3 mb-2 border rounded shadow-sm bg-white">
        <div class="d-flex w-100 justify-content-between align-items-center mb-2">
          <h5 class="mb-1" style="font-size: 1.1rem;">
            <a href="browser.html?value=${omid}" class="text-dark text-decoration-none fw-bold">${_skgifEscape(title)}</a>
          </h5>
          <span class="text-nowrap">${_skgifRoleBadges(product.contributions, agentOmid)} <span class="badge bg-light text-dark border">${_skgifEscape(year)}</span></span>
        </div>
        <div class="mb-1 small">
          ${ids}
        </div>
      </div>
    </div>`;
}

// Badges of the roles (other than author) of one person in a product, e.g.
// " Editor" in the author record; "" without agentOmid or for authors only.
function _skgifRoleBadges(contributions, agentOmid) {
  if (!agentOmid) return "";
  const roles = new Set((Array.isArray(contributions) ? contributions : [])
    .filter(c => c && c.by && c.by.local_identifier === agentOmid && c.role && c.role !== 'author')
    .map(c => c.role));
  return [...roles].map(role =>
    ` <span class="badge bg-light text-dark border">${_skgifEscape(role.charAt(0).toUpperCase() + role.slice(1))}</span>`).join('');
}

function _skgifRaMessage(text) {
  _setCiField('ra-message', `<div class="alert alert-danger mb-4">${_skgifEscape(text)}</div>`);
  releaseSkgifPage();
}
