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

// Placeholder of a list while its results arrive (paginated searches and the
// lists of the document page); the dots blink (lucinda.css).
const SKGIF_LOADING_HTML = "<div class='col-12 skgif-page-loading'>Loading the results<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span></div>";

// total_items of a search response (0 if missing).
function skgifTotal(response) {
  return response?.meta?.part_of?.total_items || 0; //legge il totale già restituito da skgif che viene usato in loadstotal
}

// Lucinda #postprocess of an #api block that asks the first page of a list
// (e.g. doc_refs in new_br_any_browser.hf): res = {status, ok, json} of
// Lucinda.fetch_api() -> table with its total_items, for getVal(<block>.total).
// 404 = 0 results (see skgifFetch()); "–" if the request failed.
function post_skgif_total(res) {
  const total = res.ok ? skgifTotal(res.json) : res.status === 404 ? 0 : null;
  return [["total"], [_ciCount(total)]];
}

// A count of the page is Lucinda's ([[Lucinda:...]] in the template, from its
// #api block); the JS writes it only if Lucinda's request failed ("–") and
// its own (asked again) worked.
function _skgifFallbackCount(elId, n) {
  const el = document.getElementById(elId);
  if (el && !/\d/.test(el.textContent)) el.textContent = String(n);
}

// A value of the table that a Lucinda #postprocess made (first row), e.g.
// _lucindaValue('doc_meta', 'found'); undefined if there is none.
function _lucindaValue(blockId, column) {
  return Lucinda_util.getCol(Lucinda.data[blockId], column)[1];
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
// timeoutMs (optional): the request is given up after that time (a failure,
// null), instead of waiting for the server, which can take minutes to fail.
//Se la risposta è in cache, la restituisce subito, se la richiesta è già in corso la aspetta, altrimenti fa la query e restituisce il json se tutto va bene, altrimenti null
// A URL that Lucinda has already asked (#api block of the .hf, same string)
// is not asked again: its response is taken from Lucinda.fetch_api(); only if
// that request failed it is asked again here.
function skgifFetch(url, timeoutMs) {
  const fromLucinda = Lucinda.api_responses[url];
  if (fromLucinda) return fromLucinda.then(res => res.ok ? res.json : res.status === 404 ? {} : _skgifFetchUrl(url, timeoutMs));
  return _skgifFetchUrl(url, timeoutMs);
}

function _skgifFetchUrl(url, timeoutMs) {
  const key = _skgifNormalizeUrl(url);
  if (_skgifResponseCache[key]) return Promise.resolve(_skgifResponseCache[key]);
  if (_skgifPendingRequests[key]) return _skgifPendingRequests[key]; //richiesta già in corso: aspetta quella
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  return _skgifPendingRequests[key] = fetch(url, controller ? { signal: controller.signal } : undefined)
    .then(r => r.ok ? r.json() : r.status === 404 ? {} : null) // SILVIA (SKG-IF): 404 = 0 results
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

// Downloads EVERY page of an SKG-IF search (SKG-IF has no sort and no date
// filter, so a list to sort or a per-year chart needs all the items): pages
// of pageSize, `parallel` requests at a time, each through skgifFetchRange()
// (a page that does not arrive is asked again in smaller pages, and a result
// the API cannot give becomes a { _skgifMissing: true } marker).
// onPage(n, items) is called as each page arrives (n from 1, in arrival
// order). Pages listed in `have` ({n: items}) are not requested again (e.g.
// the first page, already downloaded). Resolves when every page is there.
// Used by the author's works (section 9).
function skgifFetchAllPages(source, total, pageSize, parallel, onPage, have = {}) {
  const pageCount = Math.ceil(total / pageSize);
  const todo = [];
  for (let n = 1; n <= pageCount; n++) if (!have[n]) todo.push(n);
  return _skgifPool(todo, parallel, n => {
    const start = (n - 1) * pageSize;
    return skgifFetchRange(source, start, Math.min(pageSize, total - start), pageSize).then(items => onPage(n, items));
  });
}

// Runs task(n) for every n of `todo`, `parallel` at a time (the next one
// starts when one ends, so the server is never asked too much at once);
// resolves when all have ended. Used by skgifFetchAllPages() (author's works)
// and by the lists browsed page by page (_skgifPagedList()).
function _skgifPool(todo, parallel, task) {
  const queue = [...todo];
  const worker = () => {
    const n = queue.shift();
    return n === undefined ? Promise.resolve() : task(n).then(worker);
  };
  return Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, () => worker()));
}

// Status text of a list (statusId) and its progress bar (barId): fraction
// 0..1, or null to hide the bar. Author profile and document page.
function _skgifListStatus(statusId, barId, text, fraction) {
  _skgifSetField(statusId, _skgifEscape(text));
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.classList.toggle('d-none', fraction === null);
  const inner = bar.querySelector('.progress-bar');
  if (inner && fraction !== null) inner.style.width = `${Math.round(fraction * 100)}%`;
}

// Lists browsed page by page (document page, organisation page): pages of
// results asked to the API and how many at a time. Tried live on 2026-10-16
// (first time, before the API's cache): pages of 50 are much faster than
// pages of 10 in total; more than ~4 requests at a time make the server
// slower and some time out. 218 citations ~18 s, 2,571 ~73 s; very cited
// documents (br/0630685531, 14,494) take many minutes.
const SKGIF_LIST_PAGE_SIZE = 50;
const SKGIF_LIST_PARALLEL = 4;
// Lists up to this size are downloaded whole by themselves for their
// per-year chart (10 requests of 50, 3 rounds of 4): bigger ones draw it
// only on request. Chosen by number of requests (~20-30 s), not measured.
const SKGIF_CHART_AUTO_LOAD = 500;

// A list browsed 10 per page with Previous/Next (References and Citations
// of the document page, publications of an organisation): elements
// <prefix>-list, -total, -status, -progress of the template (the ones that
// are missing are skipped). first = skgifFirstPage() (null if not even the
// total could be read), a page of 10 (the one Lucinda already asked: the
// first 10 cards come with the page) or of 50. The results are kept by page of SKGIF_LIST_PAGE_SIZE
// (skgifFetchRange(), asked once each, by the list or by loadAll()); the 10
// cards of a page are cut out of them, always in the API's order: no "Sort
// by" (decided 2026-10-17, it needed every result, too slow for long lists),
// so it works as the Go to References / Go to Citations pages whatever its
// size. loadAll() is used only by the per-year chart (_skgifListChart()). A
// result the API could not give is shown as a card "1 <noun> could not be
// loaded" and is left out of the chart.
// Options: noun (of the results, for the messages), statusText(total) (text
// above the list), scrollId (element brought into view when changing page),
// renderCard(product). Several lists can take turns in the same container
// (organisation: all the publications / a title search): only the active
// one (the last created, or the one given back with activate()) writes in
// the page. While loadAll() runs, the text above the list stays the same:
// the progress bar is only in the chart box (_skgifListChart()).
function _skgifPagedList({ prefix, source, first, emptyMessage, noun, statusText, scrollId, renderCard }) {
  const containerId = `${prefix}-list`;
  const total = first ? first.total : 0;
  const blockCount = Math.ceil(total / SKGIF_LIST_PAGE_SIZE);
  const blocks = {};   //numero di pagina da 50 -> promessa dei suoi risultati
  const arrived = {};  //numero di pagina da 50 -> risultati arrivati
  const firstFull = first && first.items.length >= Math.min(SKGIF_LIST_PAGE_SIZE, total); //first = pagina da 10 (di Lucinda) o da 50
  if (firstFull) blocks[1] = Promise.resolve(first.items);
  const block = n => blocks[n] || (blocks[n] = skgifFetchRange(source, (n - 1) * SKGIF_LIST_PAGE_SIZE,
    Math.min(SKGIF_LIST_PAGE_SIZE, total - (n - 1) * SKGIF_LIST_PAGE_SIZE), SKGIF_LIST_PAGE_SIZE));
  const progressListeners = []; //chi segue lo scaricamento (il grafico)
  const loadedListeners = [];   //chi aspetta che siano arrivati tutti (Sort by dell'organizzazione)
  let ordered = null;  //i risultati nell'ordine scelto con sort(), null = ordine dell'API
  let inOrder = null;  //tutti i risultati nell'ordine dell'API (anche i mancanti), quando loadAll() è finito
  let all = null;      //solo i documenti arrivati (grafico)
  let loading = null;  //promessa di loadAll()
  let page = 1;

  const paginator = { goToPage: p => show(p, true) };
  const active = () => _skgifPaginators[containerId] === paginator;
  let lastStatus = ['', null]; //ultimo stato, rimesso da activate()
  const status = (text, fraction = null) => {
    lastStatus = [text, fraction];
    if (active()) _skgifListStatus(`${prefix}-status`, `${prefix}-progress`, text, fraction);
  };
  _skgifPaginators[containerId] = paginator;
  _skgifSetField(`${prefix}-total`, _ciCount(first ? total : null));
  status(first ? statusText(total) : '');

  const renderItems = items => items.map(item => item._skgifMissing ? _skgifMissingCard(noun) : renderCard(item)).join('');

  // The results of page p (10), from the pages of 50 that cover it.
  function itemsOfPage(p) {
    const size = SKGIF_DEFAULT_PAGE_SIZE;
    const list = ordered || inOrder;
    if (list) return Promise.resolve(list.slice((p - 1) * size, p * size));
    if (p === 1 && first && first.items.length >= Math.min(size, total)) return Promise.resolve(first.items.slice(0, size)); //subito, senza aspettare la pagina da 50
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
    if (!first) return void (container.innerHTML = `<div class="col-12"><p>The ${noun}s could not be loaded (the API did not answer).</p></div>`);
    if (!total) return void (container.innerHTML = emptyMessage ? `<div class="col-12"><p>${_skgifEscape(emptyMessage)}</p></div>` : ''); //'' = basta il testo sopra la lista
    if (scroll) document.getElementById(scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    container.innerHTML = SKGIF_LOADING_HTML;
    itemsOfPage(p).then(items => {
      if (page !== p || !active()) return; //nel frattempo è stata chiesta un'altra pagina o un'altra lista
      const pageCount = Math.max(1, Math.ceil((ordered || inOrder || { length: total }).length / SKGIF_DEFAULT_PAGE_SIZE));
      container.innerHTML = renderItems(items) + _skgifPaginationBar(containerId, p, pageCount);
    });
  }

  // Downloads every page of 50 (SKGIF_LIST_PARALLEL at a time, the ones
  // already there come at once); resolves to false only if the list could
  // not be read at all.
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
      inOrder = _skgifDedupe(Object.keys(arrived).sort((a, b) => a - b).flatMap(n => arrived[n])); //i mancanti non hanno OMID: restano tutti
      all = inOrder.filter(item => !item._skgifMissing);
      const missing = inOrder.length - all.length;
      status(statusText(all.length) + (missing ? ` (${missing} could not be loaded)` : ''));
      loadedListeners.forEach(listener => listener());
      return true;
    });
    return loading;
  }

  show(1);

  return {
    total,
    failed: !first,
    loadAll,
    items: () => all,
    missing: () => inOrder ? inOrder.length - all.length : 0,
    onProgress: listener => progressListeners.push(listener),
    onLoaded: listener => loadedListeners.push(listener), //quando loadAll() è finito (non lo fa partire)
    sort: order => { //solo dopo loadAll(): 'newest', 'oldest', 'title-asc', 'title-desc', 'default'
      if (!inOrder) return;
      ordered = order === 'default' ? null : _sortAuthorWorks(all, order); //ordinate: senza i mancanti, come nel profilo autore
      show(1);
    },
    activate: () => { //torna questa la lista mostrata
      _skgifPaginators[containerId] = paginator;
      status(...lastStatus);
      show(1);
    }
  };
}

// Per-year chart of a _skgifPagedList() (publication date of each product,
// undated ones skipped), in the element boxId: drawn by itself up to
// SKGIF_CHART_AUTO_LOAD results, up to maxLoad when "Load chart" is clicked,
// never above maxLoad (an organisation can have millions of publications).
// Meanwhile the box shows how many results have arrived and a progress bar;
// the chart is drawn only when all of them are there, with a note if some
// could not be loaded. noun: "citation", "publication"; owner: "document",
// "organisation"; label: of the bars.
function _skgifListChart(list, { boxId, noun, owner, label, maxLoad = Infinity }) {
  const box = document.getElementById(boxId);
  if (!box) return;
  if (list.failed) return void (box.innerHTML = '<em>Chart not available.</em>');
  if (!list.total) return void (box.innerHTML = `<em>No ${noun}s found.</em>`);

  const draw = () => {
    list.onProgress((loaded, total) => {
      box.innerHTML = `<div class="mb-2">Loading ${noun}s… ${loaded}/${total}</div>
        <div class="progress br-chart-progress" style="height: 6px; width: 100%;"><div class="progress-bar" style="width: ${Math.round(loaded / total * 100)}%"></div></div>`;
    });
    list.loadAll().then(() => {
      _skgifYearChart(box, list.items().map(_skgifProductRawDate), label, `No ${noun}s found.`, 200);
      const missing = list.missing();
      if (missing) box.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, noun)} could not be loaded</div>`);
    });
  };
  if (list.total <= SKGIF_CHART_AUTO_LOAD) return draw();
  if (list.total > maxLoad) return void (box.innerHTML = '<em>Chart not available.</em>');
  box.innerHTML = `<p class="mb-3">This ${owner} has ${list.total} ${noun}s.</p>
    <button type="button" class="btn btn-sm br-load-chart">Load chart</button>`;
  box.querySelector('button').addEventListener('click', draw);
}

// Time limits of the lists that split a page which does not arrive
// (skgifFetchRange()): the server can take minutes to fail (br/062404378136,
// 2,512 authors: /products times out or answers 502 after ~2 minutes even for
// it alone, checked 2026-10-17), while a page of a citation or works list
// normally arrives in a few seconds and a single result in 1-3 s.
// Shorter since 2026-10-20: some requests get no answer at all (no headers)
// and the next try of the same results arrives in seconds; with 60/60/30 s a
// chart of 81 citations (br/061101713355) waited 155 s. Measured on cold
// requests: a page of 50 up to 31 s, of 10 up to 6.6 s, one result up to 2.5 s.
const SKGIF_PAGE_TIMEOUT = 35000;       //pagina da 50
const SKGIF_SMALL_PAGE_TIMEOUT = 15000; //pagina da 10
const SKGIF_ITEM_TIMEOUT = 10000;       //un risultato
const _skgifTimeout = size => size === 1 ? SKGIF_ITEM_TIMEOUT : size <= SKGIF_DEFAULT_PAGE_SIZE ? SKGIF_SMALL_PAGE_TIMEOUT : SKGIF_PAGE_TIMEOUT;

// `count` results of a list (source without page/page_size) from position
// `start` (from 0, a multiple of `size`), asked as one page of `size`. If it
// does not arrive within timeoutMs, the same results are asked in pages of
// 10 (when bigger) and then one at a time (skgifSplitRange()): so one result
// the API cannot give (e.g. br/062404378136 among the citations of
// br/06301940975) does not take the others with it. A result that does not
// arrive even alone becomes a { _skgifMissing: true } marker, shown as
// _skgifMissingCard(). It also covers the big responses the API sometimes
// cuts (the same page came as 226 KB and 561 KB; the browser reports
// ERR_HTTP2_PROTOCOL_ERROR).
function skgifFetchRange(source, start, count, size, timeoutMs = _skgifTimeout(size)) {
  return skgifFetch(`${source}&page=${start / size + 1}&page_size=${size}`, timeoutMs)
    .then(data => data ? (data['@graph'] || []) : skgifSplitRange(source, start, count, size));
}

function skgifSplitRange(source, start, count, size, retried = false) {
  if (size === 1) { //un solo risultato: riprovato una volta (spesso il secondo tentativo arriva), poi segnato come mancante
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

// Page 1 of a list: { total, items }. If the page does not arrive, the total
// is read from a page of 1 and the items are asked in smaller pages
// (skgifSplitRange()); null if not even the total can be read.
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

// Card in place of a result the API could not give (noun: "citation",
// "reference", "publication").
function _skgifMissingCard(noun) {
  return `<div class="col-12 mb-2"><div class="card shadow-sm"><div class="card-body text-muted">1 ${noun} could not be loaded</div></div></div>`;
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
  containerId - optional, id of the element the results (and pagination
                   bar) render into; defaults to 'search-results-container',
                   the one of every search template
  totalCountId   - optional, id of the element showing the results count in
                   the page title (default 'search-total-count'); filled with
                   the total once the first page is rendered (together with
                   releaseSkgifPage(), see holdSkgifPage())
  dedupeKey(item) -> optional, key used to drop duplicates within a page;
                   defaults to the item's local_identifier
  missingNoun    - optional ("citation", "reference"): a page that does not
                   arrive is asked again in smaller pages (skgifFetchRange()),
                   and a result the API cannot give is shown as
                   "1 <missingNoun> could not be loaded". Only for the lists
                   of citations/references, whose pages are fast: a slow
                   search page would be given up too early.
*/
function createSkgifPaginatedSearch(config) {   //Gestisce la paginazione
  const containerId = config.containerId || 'search-results-container';
  const totalCountId = config.totalCountId || 'search-total-count';
  const dedupeKey = config.dedupeKey || (item => item.local_identifier || JSON.stringify(item));
  const pageSize = config.pageSize || SKGIF_DEFAULT_PAGE_SIZE;
  const sources = config.sources || [];
  let sourceTotals = null; // total_items of each source, read once on the first page
  let listedTotal = 0;     // sum of sourceTotals: shown in the title, pages are computed on it = Somma dei total_items di ogni fonte SKG-IF
  let firstItems = [];     // missingNoun: page 1 of each source, from skgifFirstPage()

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
    _skgifFallbackCount(totalCountId, listedTotal);
    releaseSkgifPage();
  }

  // Page 1 of every source (needed anyway for the first page, and cached)
  // gives each source's total_items.
  //carica i totali di ogni fonte e calcola listedTotal
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

  function fetchPage(page) { //funzione orchestratrice delle altre
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = SKGIF_LOADING_HTML;
    }

    loadTotals() //chiama load total che calcola i numeri
      .then(() => itemsForPage(page))
      .then(pageItems => {
        const seen = new Set();
        const items = pageItems.filter(item => {
          if (item._skgifMissing) return true; //risultato mancante: non è un doppione
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
    let html = items.map(item => item._skgifMissing ? _skgifMissingCard(config.missingNoun) : config.renderItem(item)).join(''); //(html= rendering delle cards)

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize)); //calcolo numero pagine
    html += _skgifPaginationBar(containerId, page, totalPages); //barra di paginazione sotto le cards

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

// The pagination bar under a list (First/Previous, "Page N of M", Next/Last).
// Its buttons and page input are handled by the delegated listeners below,
// which call _skgifPaginators[containerId].goToPage().
function _skgifPaginationBar(containerId, page, totalPages) {
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
  return `
    <div class="col-12">
      <nav class="skgif-pagination" aria-label="Search results pages">
        ${prevBtns}
        <span class="skgif-page-info">Page ${pageInput} of ${totalPages}</span>
        ${nextBtns}
      </nav>
    </div>`;
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

// A field of the API that should be a list (manifestations, contributions,
// identifiers): [] when it is missing.
function _skgifArray(value) {
  return Array.isArray(value) ? value : [];
}

// "1 publication", "2 publications".
function _skgifPlural(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
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

// What a search page asks the API (entity: products, persons, venues,
// organisations), from its search_query (decoded):
//   { label, source }   source = search URL without page/page_size ("" = nothing to search)
//   { label, omidUrl }  OMID search: /<entity>/<full OMID>, a single record
//   fields              author search: { given, family } (for the ranking)
// label is the text after "Results for:". Used by the #preprocess of the
// search block (pre_skgif_search()) and by the #callfun, so that both ask the
// same URL and the first page is requested once (skgifFetch()).
//   ID panel "scheme=doi&id=..."  -> identifiers.scheme + id (venues: identifiers.value);
//                                    every scheme as typed: 404 = 0 results
//   omid                          -> the record itself (no filter); accepts
//                                    "br/0601...", "omid:br/0601..." or the w3id URL
//   persons                       -> cf.search.given_name / family_name (_authorSearchFields())
//   products                      -> cf.search.title; venues, organisations -> cf.search.name
function _skgifSearchPlan(entity, query) {
  const idQuery = _skgifIdQuery(query);
  if (idQuery) {
    const { scheme, id } = idQuery;
    const label = `${scheme}: ${id}`; //titolo: "doi: 10.1/..."
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
    if (fields.given) filters.push(`cf.search.given_name:${apiTerm(fields.given)}`); //nome
    if (fields.family) filters.push(`cf.search.family_name:${apiTerm(fields.family)}`); //cognome
    return { label, fields, source: filters.length ? `${SKGIF_API}/persons?filter=${filters.join(',')}` : '' }; //virgola = E
  }
  const term = _skgifSafeTerm(query); //NFC + caratteri che rompono la richiesta
  const field = entity === 'products' ? 'cf.search.title' : 'cf.search.name';
  return { label: term, source: term ? `${SKGIF_API}/${entity}?filter=${field}:${encodeURIComponent(term)}` : '' };
}

// Lucinda #preprocess of the search block of a search page, e.g.
// pre_skgif_search(persons, search_query): search_url = the URL of the first
// page ("" = nothing to search: Lucinda sends no request), search_label.
function pre_skgif_search(entity, searchQuery) {
  let query = String(searchQuery || '');
  try { query = decodeURIComponent(query); } catch (e) { /* keep as is */ }
  const plan = _skgifSearchPlan(entity, query);
  const url = plan.omidUrl || (plan.source ? `${plan.source}&page=1&page_size=${SKGIF_DEFAULT_PAGE_SIZE}` : '');
  return { search_url: url, search_label: plan.label };
}

// Lucinda #postprocess of the search block: [total, label] for the title
// "<total> Results for: <label>". total: total_items; OMID search 1 or 0;
// 0 when there was nothing to search or 404; "–" if the request failed.
function post_skgif_search(res, searchUrl, searchLabel) {
  let total;
  if (!searchUrl) total = 0;
  else if (!searchUrl.includes('?')) total = res.ok && (res.json?.['@graph'] || [])[0]?.local_identifier ? 1 : (res.ok || res.status === 404 ? 0 : '–'); //ricerca per OMID: il record stesso
  else total = post_skgif_total(res)[1][0];
  return [['total', 'label'], [String(total), searchLabel]];
}

// Runs the search of a search page (#callfun), from its plan: the cards of
// the results, page by page. The title (count and label) is Lucinda's.
function _skgifRunSearch(plan, renderItem, rankItems) {
  if (plan.omidUrl) return _skgifShowByOmid(plan.omidUrl, renderItem);
  if (!plan.source) return _skgifShowMessage('No results found.');
  createSkgifPaginatedSearch({ sources: [plan.source], rankItems, renderItem }).search();
}

// OMID search: /<entity>/<full OMID> returns a single record, not a search
// page (no total_items), so the card is shown here instead of by the
// paginator. 404 = no record of that entity with that OMID.
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
    ? `<a href="${_skgifEscape(url)}" target="_blank" class="text-dark text-decoration-none">${label}</a>` //link esterno (DOI, ORCID...): nuova scheda; i link interni a Lucinda restano nella stessa scheda, così funziona il tasto indietro del browser
    : label;
}

// SKG-IF identifiers array (+ the OMID, if given) -> "doi:... • openalex:... • omid:br/...".
// asBadges: each identifier in a badge instead (author's list, as Pietro's).
//crea l'intera riga degli identificativi mettendo insieme le funzioni precedenti
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
    .join(asBadges ? ' ' : ' • '); //puntino per separare
}

// The agents of a product with one role (author, editor, publisher), from
// its contributions: [{ role, by: { name, family_name, given_name,
// local_identifier, identifiers }, rank }] -> the `by` objects, by rank.
function _skgifContributors(contributions, role) {
  return _skgifArray(contributions)
    .filter(c => c && c.role === role && c.by) //tiene le voci con il ruolo specificato
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) //ordina per rank
    .map(c => c.by);
}

// Name of an agent as in Pietro's cards, "Family, Given" (or the name of an
// organisation), escaped.
function _skgifAgentName(by) {
  return _skgifEscape(_skgifAgentPlainName(by));
}

// The same name, not escaped (data for a Lucinda #postprocess).
function _skgifAgentPlainName(by) {
  return (by.name || '').trim() || [by.family_name, by.given_name].filter(Boolean).join(', ') || 'Unknown Name';
}

// Page of an agent: browser.html?value=ra/<id> (author page; organisations
// share the ra/ prefix, as documents and venues share br/).
const _skgifAgentUrl = agentOmid => `browser.html?value=${agentOmid}`;

// Agents of a product with one role, by rank, separated by " • " as in
// Pietro's cards; the name links to agentUrl(<short OMID>), the ORCID
// follows in brackets when present and withOrcid (the document page shows
// names only, decided 2026-10-17). "" if there are none. Used by the
// document cards, the venue cards and the document page.
//logica per recuperare nomi autori per i documenti e publisher/editor nelle riviste
function _skgifAgents(contributions, role, agentUrl = _skgifAgentUrl, withOrcid = true) {
  return _skgifContributors(contributions, role)
    .map(by => { //costruzione del nome linkabile + orcid tra parentesi
      const name = _skgifAgentName(by);
      const agentOmid = _skgifOmid(by.local_identifier);
      const orcid = withOrcid ? _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value : null;
      let html = agentOmid
        ? `<a href="${agentUrl(agentOmid)}" class="text-dark text-decoration-none">${name}</a>`
        : `<span>${name}</span>`;
      if (orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(orcid)}" target="_blank">${_skgifEscape(orcid)}</a>)</span>`; //parentesi e ORCID sulla stessa riga
      return html;
    })
    .join(' • ');
}

// Pages of a manifestation's biblio: "first<dash>last", one page when they
// are the same (as Pietro), "" if none. Not escaped.
function _skgifPageRange(biblio, dash) {
  const pages = (biblio || {}).pages || {};
  return pages.first && pages.last && pages.first !== pages.last ? `${pages.first}${dash}${pages.last}` : (pages.first || pages.last || '');
}

// Authors of a product for the document card and the citation record: when
// a product has no authors (often edited books) its editors are shown in
// their place, labelled "Editors" (prof's decision). { label, html }, html
// "Unknown" when there are neither.
function _skgifAuthorsOrEditors(contributions) {
  const authors = _skgifAgents(contributions, 'author');
  const editors = authors ? "" : _skgifAgents(contributions, 'editor');
  return { label: editors ? 'Editors' : 'Authors', html: authors || editors || 'Unknown' };
}

// ---VIEW FUNCTIONS (SKG-IF)---
// Lucinda fills the record pages ([[Lucinda:...]] in the templates) from the
// tables made by the #postprocess of their #api blocks (post_skgif_*: data
// only, no HTML). These view functions build the HTML from those tables, as
// Pietro's create_br_header_link(), create_author_header_link(): each
// argument is a column of a table (e.g. doc_meta.authors), _lvCell() reads
// its value. Lucinda puts each result in a <span class="lucinda-<name>">.
function _lvCell(arg) {
  return Lucinda_util.lucinda_unformat(arg).getData()[0]?.[0];
}

// Plain text, escaped.
Lucinda_view.prototype.skgif_text = function (...args) {
  return _skgifEscape(_lvCell(args[0]) ?? '');
};

// skgif_head(title, head_line, head_meta, omid): the header of a document,
// one line each (_skgifHeaderHtml()); the OMID as title when there is no document.
Lucinda_view.prototype.skgif_head = function (...args) {
  const [title, line, meta, omid] = args.map(_lvCell);
  return _skgifHeaderHtml(title || omid, line, meta);
};

// skgif_doc_link(omid, title): the title, linked to the document page.
Lucinda_view.prototype.skgif_doc_link = function (...args) {
  const [omid, title] = args.map(_lvCell);
  return `<a href="browser.html?value=${_skgifEscape(omid)}">${_skgifEscape(title)}</a>`;
};

// skgif_agents(list of { name, omid, orcid? }): each name to its page, the
// ORCID in brackets when the data has it, " • " between them.
Lucinda_view.prototype.skgif_agents = function (...args) {
  return _skgifArray(_lvCell(args[0])).map(agent => {
    let html = agent.omid
      ? `<a href="${_skgifAgentUrl(agent.omid)}" class="text-dark text-decoration-none">${_skgifEscape(agent.name)}</a>`
      : `<span>${_skgifEscape(agent.name)}</span>`;
    if (agent.orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(agent.orcid)}" target="_blank">${_skgifEscape(agent.orcid)}</a>)</span>`; //parentesi e ORCID sulla stessa riga
    return html;
  }).join(' • ');
};

// skgif_source({ name, omid, identifiers }): the venue (-> its page) and its identifiers.
Lucinda_view.prototype.skgif_source = function (...args) {
  const venue = _lvCell(args[0]);
  return venue ? _skgifSourceHtml(venue.name, venue.omid, venue.identifiers) : '';
};

// skgif_ids(list of { scheme, value }, omid?): the identifiers, DOI first, linked.
Lucinda_view.prototype.skgif_ids = function (...args) {
  return _skgifIdList(_lvCell(args[0]), args[1] ? _lvCell(args[1]) : undefined);
};

// skgif_orcid(orcid): the ORCID, linked to orcid.org (author page).
Lucinda_view.prototype.skgif_orcid = function (...args) {
  const orcid = _skgifEscape(_lvCell(args[0]) ?? '');
  return `<a href="https://orcid.org/${orcid}" target="_blank">${orcid} <sup><i class="fas fa-external-link-alt small"></i></sup></a>`;
};

// skgif_uri(omid): the full OMID URI, linked (citation record).
Lucinda_view.prototype.skgif_uri = function (...args) {
  const uri = `https://w3id.org/oc/meta/${_skgifEscape(_lvCell(args[0]) ?? '')}`;
  return `<a href="${uri}" target="_blank">${uri}</a>`;
};

// skgif_oci(oci): "ci/<oci>" of the page URL (decoded, without "oci:").
Lucinda_view.prototype.skgif_oci = function (...args) {
  let oci = String(_lvCell(args[0]) ?? '');
  try { oci = decodeURIComponent(oci); } catch (e) { /* keep as is */ }
  return `ci/${_skgifEscape(oci.trim().replace(/^oci:/i, ''))}`;
};

// --- Products: title, date, source (from section 4) ---

// Title of a product: "none" is the language-less title, else the first
// language found (the API groups the titles by language). Plain text.
function _skgifProductTitle(product) {
  return _skgifProductRawTitle(product) || 'No title';
}

// The same title, '' when the product has none (title search of the author
// profile, _raTitleHas()).
function _skgifProductRawTitle(product) {
  const titles = product.titles || {};
  return (titles.none || Object.values(titles)[0] || [])[0] || ''; //L'API raggruppa i titoli per lingua
}

// Publication date of a product, from its manifestations, escaped. The date
// is a full timestamp ("2024-01-01T00:00:00"): only the date part is shown.
function _skgifProductDate(product) {
  const pubDate = _skgifProductRawDate(product);
  return pubDate ? _skgifEscape(String(pubDate).slice(0, 10)) : 'Unknown'; //dalla lettura della data in json tiene conto solo dei primi 10 caratteri
}

// Publication date of a product as the API gives it ("2024-01-01T00:00:00"),
// from the first manifestation that has one; undefined if none. Also used to
// sort the author's works and for the "Publications per year" chart.
function _skgifProductRawDate(product) {
  const manifestations = _skgifArray(product.manifestations);
  return manifestations.map(m => m?.dates?.publication?.[0]).find(Boolean);
}

// Source of a product (manifestations[].biblio.in): venue title (italic) ->
// venue page, its identifiers (without omid) in brackets. "" if none. Used by
// the document cards and by the document record (section 10).
function _skgifProductSource(product) {
  const venue = _skgifProductVenue(product);
  return venue ? _skgifSourceHtml(venue.name, _skgifOmid(venue.local_identifier), venue.identifiers) : "";
}

// The venue of a product (manifestations[].biblio.in with a name), or undefined.
function _skgifProductVenue(product) {
  return _skgifArray(product.manifestations).map(m => m?.biblio?.in).find(v => v && v.name);
}

// HTML of a source from its data (also the view function skgif_source, section 10).
function _skgifSourceHtml(name, venueOmid, identifiers) {
  const venueTitle = `<i>${_skgifEscape(name)}</i>`; //titolo della rivista in corsivo
  const titleHtml = venueOmid
    ? `<a href="browser.html?value=${venueOmid}" class="text-dark text-decoration-none">${venueTitle}</a>`
    : venueTitle;
  const venueIds = _skgifIdList(identifiers); //lista degli ids del venue
  return venueIds ? `${titleHtml} (${venueIds})` : titleHtml;
}

// --- Work cards and lists shared by several pages (from sections 8 and 9) ---

// Compact card of a work in the author's list (the document search keeps
// _renderDocumentCard()): one line per piece of information, label at the
// start of the line. Title (-> document page) with the year on the right as
// in Pietro's list; all the authors (editors when there are none, as in the
// other cards) by name only; source; identifiers as badges as in Pietro's
// list; References/Citations. The person of the profile is in bold in the
// list of names (their position among the authors). A badge next to the
// year with the role of the profile's agent in the work, from badgeOf(set of
// roles): on the author profile "Editor", or "Author & Editor" when they are
// both (so every work of the "As editor" filter has it); on the organisation
// page the organisation's roles (_orgRoleBadge()).
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
    return by.local_identifier === _raPersonOmid ? `<strong>${html}</strong>` : html; //la persona del profilo in grassetto, come nei CV
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

// Works without repeated OMIDs (the same work could come on two pages).
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

// The "Back to top" button, shown once the page is scrolled down (author
// profile and document page).
function _initAuthorListUi() {
  const top = document.getElementById('ra-top');
  if (!top) return;
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => top.classList.toggle('d-none', window.scrollY < 800));
}

// --- Charts and page fields (from section 8) ---

// Draws in box a bar chart with the number of dates per year (first 4
// characters of each date: "2019", "2019-07" or "2019-07-03"; empty dates
// skipped). Only the years with at least one date are on the axis, as
// Pietro's barchart() / barchart_simple(), same Chart.js style.
// fill: the chart takes the whole width of box, `fill` px high (author and
// document pages, 2026-10-17: a wider chart, years not slanted); without it,
// Chart.js's default size (citation record).
function _skgifYearChart(box, dates, label, emptyMessage, fill) {
  const perYear = {}; //anno -> quante date in quell'anno
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
    ? `<div style="position: relative; width: 100%; max-width: ${Math.min(600, 150 + years.length * 80)}px; margin: 0 auto; height: ${fill}px;"><canvas></canvas></div>` //pochi anni = grafico più stretto (1 anno 230 px, 2 anni 310...), da 6 anni in su 600
    : '<canvas style="display: block; margin: 0 auto;"></canvas>';
  new Chart(box.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{ label, backgroundColor: '#9a31fc', data: years.map(y => perYear[y]), borderWidth: 1, maxBarThickness: 60 }] //60: un solo anno non riempie tutto il grafico
    },
    options: {
      responsive: !!fill,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1, callback: v => Number.isInteger(v) ? v : '' } } }
    }
  });
}

function _skgifSetField(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// A count, or "–" when its request failed (null).
function _ciCount(n) {
  return n === null ? '–' : String(n);
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
//   scheme=orcid&id=0000-...    -> identifiers.id, see _skgifSearchPlan()
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
  const plan = _skgifSearchPlan('persons', _skgifUrlParam(args[1], 'search_query')); //URL e titolo, come il #preprocess di Lucinda
  _skgifRunSearch(plan, _renderAuthorCard, plan.fields && (items => _rankAuthorsByQuery(items, plan.fields))); //match esatti del nome in cima (non per la ricerca per ID)
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

  const identifiers = _skgifArray(person.identifiers);
  const orcid = _skgifEscape(identifiers.find(i => i.scheme === "orcid")?.value || "");

  const fullname = (person.name || "").trim()
    || `${person.given_name || ""} ${person.family_name || ""}`.trim()
    || "Unknown Name";

  const orcidHtml = orcid
    ? `<a href="https://orcid.org/${orcid}" target="_blank" class="text-dark text-decoration-none">${orcid}</a>`
    : '<span class="skgif-none">No ORCID found</span>'; //come nelle schede: corsivo grigio, senza rientro

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
  _skgifRunSearch(_skgifSearchPlan('products', _skgifUrlParam(args[1], 'search_query')), _renderDocumentCard); //una sola richiesta, la query così come è scritta
}

// ---doc_free_text (SKG-IF)---
// Header of the document, citations and references pages (prof's request,
// 2026-10-17: the document as a bibliographic reference, not "br/<id>").
// One piece of information per line, never split on two lines (a line too
// long ends with "...", full text on hover; user's request):
//   Title
//   First 3 authors, et al. · Year · Venue Vol(Issue), Pages
//   doi:... · br/<id>                                   (small, grey)
// Authors as in APA (Family, G.); editors "(Ed./Eds.)" when there are no
// authors; publisher when there is no venue (books). Nothing clickable.
// Data as the API gives it (year of the padded date).
function _skgifHeaderLines(product, omid) {
  const text = _skgifHeaderText(product, omid);
  return _skgifHeaderHtml(text.title, text.line, text.meta);
}

// The three lines of the header as plain text: { title, line, meta } (data
// for a Lucinda #postprocess).
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

// HTML of the header from its three lines (also the view function skgif_head, section 10).
function _skgifHeaderHtml(title, lineText, meta) {
  const line = (cls, text) => text ? `<div class="${cls}" title="${_skgifEscape(text)}">${_skgifEscape(text)}</div>` : '';
  return line('skgif-head-title', title) + line('skgif-head-line', lineText) + line('skgif-head-meta', meta);
}

// ---doc_free_text (SKG-IF)---
// HTML card for one product of the results page: same layout and links as
// Pietro's api_search() cards (links are relative, see the author card).
// Also used by the citation/reference lists (section 5).
function _renderDocumentCard(product) {
  const omid = _skgifOmid(product.local_identifier); //prende omid corto
  if (!omid) return ""; //senza omid non risegna la card del documento

  const title = _skgifProductTitle(product);

  // Authors (publishers etc. are left out) -> author page; editors in their place when there are no authors
  const { label: agentsLabel, html: formattedAuthors } = _skgifAuthorsOrEditors(product.contributions);

  // Date and venue come from the manifestation.
  const formattedDate = _skgifProductDate(product);
  const formattedSource = _skgifProductSource(product);

  const formattedIds = _skgifIdList(product.identifiers, omid) || 'No ID';

  // Type as a small label next to the title; publisher only without a
  // source (books: for an article the journal is what counts). Order as in a
  // citation and in the author/document page cards (decided 2026-10-17):
  // who, when, where, then the identifiers.
  const type = _skgifArray(product.manifestations)
    .map(m => m?.type?.labels?.en).find(Boolean) || '';
  const publisher = formattedSource ? '' : _skgifAgents(product.contributions, 'publisher');

  const ocRecordUrl = `browser.html?value=${omid}`; //titolo
  const refUrl = `browser.html?value=doc_ref/${omid}`;  // bottone "Go to References"
  const citUrl = `browser.html?value=doc_cit/${omid}`; // bottone "Go to Citations"

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
  // header (the reference of the document) and count are Lucinda's (#api
  // blocks of the .hf, page_size=1: a page of 10 or 50 asked to a cold API
  // can arrive cut, 2026-10-20); the first page comes from list_page
  createSkgifPaginatedSearch({ //manda richiesta
    sources: [`${SKGIF_API}/products?filter=${filter}:${encodeURIComponent(omidUrl)}`],
    renderItem: _renderDocumentCard, //mostra card
    emptyMessage,
    missingNoun: filter === 'cf.cites' ? 'citation' : 'reference' //una citazione che l'API non riesce a dare non blocca la lista
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
//   venue/scheme=issn&id=... -> ID panel, see _skgifSearchPlan()
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
  _skgifRunSearch(_skgifSearchPlan('venues', _skgifUrlParam(args[1], 'search_query')), _renderVenueCard); //una sola richiesta, il nome così come è scritto, tutti i type
}

// ---venue_free_text (SKG-IF)---
// HTML card for one venue of the results page: same layout and title link
// as Pietro's api_search_venue() cards, plus the venue type. Publisher and
// editor go in the empty .venue-agents box, filled by _loadVenueAgents()
// when its request ends (the card is in the page by then). Order (decided
// 2026-10-17): title, type (journal, series, book...), publisher, editor,
// identifiers last, as in the catalogues of journals.
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

// ---venue_free_text (SKG-IF)---
// Publisher and editor of a venue. /venues has no contributions, but the
// venue OMID is also a product: /products/<venue OMID> returns the journal
// with its contributions (role publisher / editor), as Pietro's Meta
// record. One request per venue, through skgifFetch() (cached, so going
// back to a page doesn't repeat it). A failed request leaves the box empty.
// The names link to browser.html?value=ra/<id> (Pietro linked the
// w3id.org/oc/meta/ar/ page, the role, not the agent): editors are persons
// (author page), publishers are organisations, which share the ra/ prefix
// (as documents and venues share br/); the organisation page is still to do.
//Nelle card di Pietro comparivano anche Publisher (editore) ed Editor. Però l'API /venues restituisce solo nome, tipo e identificativi: niente editore, niente editor.
//In OpenCitations una rivista è registrata anche come prodotto, con lo stesso OMID. Chiedendo a /products quell'OMID, si ottiene la rivista con le sue contributions, dentro le quali ci sono publisher ed editor.
function _loadVenueAgents(omid) {
  skgifFetch(`${SKGIF_API}/products/https://w3id.org/oc/meta/${omid}`).then(data => { //seconda richiesta per ogni rivista mostrata per recuperaree editor e publisher
    const contributions = (data?.['@graph'] || [])[0]?.contributions; //dal prodotto prende le contributions
    const row = (role, label) => {
      const agents = _skgifAgents(contributions, role); //uso di skgifagents due volte: una volta per editor e una per publisher
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
//   organisation/scheme=crossref&id=...  -> ID panel, see _skgifSearchPlan()
// SKG-IF organisations on OC have only name, OMID and, for some, a Crossref
// member id (identifiers [{scheme: crossref, value: "78"}]). Every record is
// shown as the API returns it: the same publisher is recorded once per
// article in Meta, so a name can have many identical records (to discuss).
// Special characters as in the document search.
//
// #callfun args: args[1] = Lucinda.data.main (has search_query), see
// api_search_author_skgif().
function api_search_org_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('organisations', _skgifUrlParam(args[1], 'search_query')), _renderOrgCard);
}

// ---org_free_text (SKG-IF)---
// HTML card for one organisation of the results page, same layout as the
// venue cards. The name links to browser.html?value=ra/<id>, as the
// publishers in the venue cards (the organisation page is still to do).
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
// in the citing's related_products.cites; if not, only a warning is shown
// (no cards: the citation doesn't exist).
// The two "Citations per year" charts come from the Index API (see
// _skgifCitationsPerYearChart()), loaded after the record is shown.
// ON HOLD (to discuss with the prof): the citation's own metadata
// (creation, timespan, journal/author self-citation: only in the Index API).
// All the requests above are #api blocks of new_ci_browser.hf (Lucinda, in
// parallel): pre_skgif_oci() splits the OCI, post_skgif_ci_doc() and
// post_skgif_total() make the tables, the view functions skgif_* the HTML.

// Lucinda #preprocess: "<citing>-<cited>" (also "oci:...") -> { citing, cited },
// {} for an invalid OCI (the [[citing]] / [[cited]] placeholders stay and
// Lucinda sends no request).
function pre_skgif_oci(oci) {
  let value = String(oci || '');
  try { value = decodeURIComponent(value); } catch (e) { /* keep as is */ }
  const parts = value.trim().replace(/^oci:/i, '').match(/^(\d+)-(\d+)$/); //OCI = omid del citing - omid del cited
  return parts ? { citing: parts[1], cited: parts[2] } : {};
}

// Lucinda #postprocess of the citing_meta / cited_meta blocks
// (/products/<full OMID>): data only. status: found, missing (404 or empty)
// or failed; agents: the authors, or the editors when there are none (as in
// the cards); cites: the OMIDs the document cites (to check the citation).
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
  const editors = authors.length ? [] : agents('editor'); //editor al posto degli autori se mancano, come nelle card
  return [header, ['found', omid, _skgifProductTitle(doc), editors.length ? 'Editors' : 'Authors',
    authors.length ? authors : editors,
    String(_skgifProductRawDate(doc) || '').slice(0, 10),
    _skgifArray(doc.identifiers).map(i => ({ scheme: i.scheme, value: i.value })),
    _skgifArray(doc.related_products?.cites)]];
}

// What is wrong with the record, from the OCI and the two documents
// (statuses and cites of post_skgif_ci_doc()): { text, type } or null.
// 'danger': nothing else is shown; 'warning': the citation does not exist,
// no cards either.
function _skgifCiProblem(oci, citingStatus, citedStatus, cites) {
  const ids = pre_skgif_oci(oci);
  if (!ids.citing) return { text: 'This is not a valid OCI.', type: 'danger' };
  if (citingStatus === 'failed' || citedStatus === 'failed') return { text: SKGIF_FAILED_MESSAGE, type: 'danger' };
  const missing = [[citingStatus, ids.citing], [citedStatus, ids.cited]].filter(([status]) => status !== 'found').map(([, id]) => `br/${id}`);
  if (missing.length) return { text: `No document with OMID ${missing.join(' or ')} available.`, type: 'danger' };
  if (!_skgifArray(cites).includes(`https://w3id.org/oc/meta/br/${ids.cited}`)) return { text: 'This citation is not available.', type: 'warning' };
  return null;
}

// skgif_ci_message(oci, citing status, cited status, citing cites): the
// message above the record ("" if there is none).
Lucinda_view.prototype.skgif_ci_message = function (...args) {
  const problem = _skgifCiProblem(...args.map(_lvCell));
  return problem ? `<div class="alert alert-${problem.type} mb-4">${_skgifEscape(problem.text)}</div>` : '';
};

// #callfun args: args[1] = Lucinda.data.main (has the oci of "ci/{oci}"),
// see api_search_author_skgif(). Runs after Lucinda has filled the page:
// shows the record (if there is no message) and draws the two charts.
function api_citation_record_skgif(...args) {
  const oci = _skgifUrlParam(args[1], 'oci');
  if (_skgifCiProblem(oci, _lucindaValue('citing_meta', 'status'), _lucindaValue('cited_meta', 'status'), _lucindaValue('citing_meta', 'cites'))) return;
  const { citing, cited } = pre_skgif_oci(oci);
  document.getElementById('ci-record')?.classList.remove('d-none');
  _ciAlignTitles();
  _skgifCitationsPerYearChart('ci-citing-chart', citing); //grafici per anno dall'Index, dopo che la pagina è visibile
  _skgifCitationsPerYearChart('ci-cited-chart', cited);
}

// The two titles (citing / cited work) as high as the higher one when the
// cards are side by side, so the fields below start at the same height on
// both sides (the counters and the charts are already aligned at the bottom).
function _ciAlignTitles() {
  const titles = ['citing-title', 'cited-title'].map(id => document.getElementById(id)).filter(Boolean);
  const align = () => {
    titles.forEach(t => { t.style.minHeight = ''; });
    if (window.innerWidth < 768) return; //schede una sotto l'altra (col-md)
    const height = Math.max(...titles.map(t => t.offsetHeight));
    titles.forEach(t => { t.style.minHeight = `${height}px`; });
  };
  align();
  window.addEventListener('resize', align);
}

// ---new_ci_browser, new_br_any_browser (SKG-IF)---
// "Citations per year" bar chart of a document, in the box with id boxId
// (Pietro's barchart_from_ids() / barchart(), same Chart.js style). NOT from
// SKG-IF: it has no date filter or sort, so every citing product would have
// to be downloaded, 50 per page. The Index API returns every citation with
// its date ("creation" = publication date of the citing document, "2019",
// "2019-07" or "2019-07-03") in one request. Citations without a date are
// skipped, as Pietro did. The total can differ by a few from the SKG-IF
// Citations counter (SKG-IF also has some citing preprints without DOI).
// For very cited documents (e.g. br/0630685531, ~14,500 citations) the Index
// response arrives cut (checked 2026-10-12): the request fails and a message
// replaces the chart.
const OC_INDEX_API = "https://api.opencitations.net/index/v2";

function _skgifCitationsPerYearChart(boxId, id) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = '<em>Loading...</em>';
  skgifFetch(`${OC_INDEX_API}/citations/omid:br/${id}`).then(data => { //una sola richiesta: tutte le citazioni con la data
    if (!Array.isArray(data)) {
      box.innerHTML = '<em>Chart not available (the OpenCitations Index did not return the citations).</em>';
      return;
    }
    _skgifYearChart(box, data.map(c => c.creation), '# Citations', 'No citations found.', 200); //alto 200 px e largo quanto il riquadro, come nelle altre schede
  });
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
//                                                 -> ALL the works (every page),
//                                                    each shown as the document
//                                                    card of the search
//                                                    (_renderDocumentCard());
//                                                    total_items is the
//                                                    Publications count
// Decided with the prof's student (2026-10-09), to reconsider after seeing it:
// - only the works of this record, as Pietro (the same person can have other
//   ra/ records with the same ORCID in OC: not merged here);
// - the filter has every role (author AND editor; Pietro: author only, e.g.
//   ra/0614010840729 = 115 vs 111), shown without a role badge.
// Prof's request (2026-10-16): everything from SKG-IF (no Meta for the chart)
// and no pagination. SKG-IF has no sort and no date filter, so every work is
// downloaded (see _loadAuthorWorks()): the list grows page by page, then the
// "Sort by" menu and the "Publications per year" chart work on all of them.
//
// Name, ORCID, identifiers and the Publications count are Lucinda's (#api
// blocks of new_ra_browser.hf: post_skgif_person(), post_skgif_total() and the
// view functions skgif_*); the first page of works is Lucinda's request.
// Lucinda opens this page only when /persons has the OMID (#api check in the
// main block of new_ra_browser.hf); any other ra/ goes to new_org_browser.

// Lucinda #postprocess of the author_meta block (/persons/<full OMID>): data
// only, the HTML is made by the view functions. head = the name for the page
// header (ra/<id> without a person); name as create_author_header_link().
function post_skgif_person(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'orcid', 'ids'];
  const omid = `ra/${id}`;
  const person = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; //{} = nessuna persona, null = richiesta fallita
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

// #callfun args: args[1] = Lucinda.data.main (has the id of "ra/{id}"), see
// api_search_author_skgif(). Runs after Lucinda has filled the page: shows
// the record and loads all the works (list, Sort by, role filter, chart).
function api_author_record_skgif(...args) {
  if (!_lucindaValue('author_meta', 'found')) return; //messaggio già scritto da Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = `https://w3id.org/oc/meta/ra/${id}`;
  const works = `${SKGIF_API}/products?filter=contributions.by.local_identifier:${encodeURIComponent(omidUrl)}`;

  document.getElementById('ra-record')?.classList.remove('d-none');
  _skgifSetField('ra-pubs-chart', '<em>Loading...</em>');
  skgifFirstPage(works, SKGIF_DEFAULT_PAGE_SIZE) //prima pagina: già scaricata da Lucinda
    .then(page => _loadAuthorWorks(works, page, omidUrl)); //prime 10 subito, poi le altre, ordinamento, filtro per ruolo e grafico
}

// How many pages of works are requested at the same time (pages of
// SKGIF_DEFAULT_PAGE_SIZE: ra/0614010840729, 115 works = 12 pages, all in
// ~5.5 s, checked 2026-10-16). Pages of 10 and not of 50 as on the document
// page: an author has tens or hundreds of works, and with 10 the first cards
// come sooner and the total is not slower (ra/0621010775619, 72 works: 10 ->
// first 2.2 s, all 5.5 s; 50 -> first 6.9 s, all 11.9 s; checked 2026-10-17).
const SKGIF_AUTHOR_PARALLEL_PAGES = 6;

// All the works of the author, from the first page already downloaded: the
// other pages are requested SKGIF_AUTHOR_PARALLEL_PAGES at a time and shown
// as soon as they arrive, in the API's order (a page is shown when all the
// ones before it are there, so the list grows without jumping), with a
// progress bar in the toolbar. A page that does not arrive is asked again in
// smaller pages (skgifFetchRange()). When every
// page is there the sort buttons are enabled, the role filter appears (only
// if the person is author of some works and editor of others) and the chart
// is drawn from the publication dates of all the works. A work the API
// cannot give (skgifFetchRange()) is a card "1 publication could not be
// loaded" in the API's order, left out of the sorted list, the role filter
// and the chart.
// personOmid: full OMID of the person, to find their role in each work.
let _raPersonOmid = '';

function _loadAuthorWorks(works, firstPage, personOmid) {
  _raPersonOmid = personOmid;
  const container = document.getElementById('search-results-container');
  const chart = document.getElementById('ra-pubs-chart');
  const setChart = html => { if (chart) chart.innerHTML = html; };
  _initAuthorListUi();

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
  const pages = new Array(pageCount); //opere di ogni pagina, nell'ordine dell'API
  pages[0] = firstPage.items;
  let shownPages = 0; //pagine già mostrate (tutte quelle prima sono arrivate)
  setChart('<em>Loading...</em>');

  const loadedCount = () => pages.reduce((n, page) => n + (page ? page.length : 0), 0);
  const showArrived = () => { //mostra le pagine arrivate in fila, senza buchi
    let html = '';
    while (shownPages < pageCount && pages[shownPages]) html += pages[shownPages++].map(_renderAuthorWorkOrMissing).join('');
    if (html && container) container.insertAdjacentHTML('beforeend', html);
    const loaded = Math.min(loadedCount(), total);
    _setAuthorListStatus(`Loading publications… ${loaded}/${total}`, loaded / total);
  };
  if (container) container.innerHTML = '';
  showArrived();

  const onPage = (n, items) => { pages[n - 1] = items; showArrived(); };
  skgifFetchAllPages(works, total, SKGIF_DEFAULT_PAGE_SIZE, SKGIF_AUTHOR_PARALLEL_PAGES, onPage, { 1: pages[0] }).then(() => {
    const inOrder = _skgifDedupe(pages.flat()); //i mancanti non hanno OMID: restano tutti
    const all = inOrder.filter(w => !w._skgifMissing);
    const missing = inOrder.length - all.length;
    const missingNote = missing ? ` (${missing} could not be loaded)` : '';
    _skgifYearChart(chart, all.map(_skgifProductRawDate), '# Publications', 'No publications found.', 200); //grafico: tutte le opere, largo quanto il riquadro
    if (missing) chart.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, 'publication')} could not be loaded</div>`);
    const plural = n => _skgifPlural(n, 'publication');
    _setAuthorListStatus(plural(all.length) + missingNote, null);

    let order = 'default', role = 'all', term = ''; //ordinamento, ruolo e parole cercate nel titolo
    const show = () => {
      let works = role !== 'all' ? all.filter(w => _raPersonRoles(w).has(role))
        : order === 'default' && !term ? inOrder : all; //i mancanti solo nell'ordine dell'API
      if (term) works = works.filter(w => _raTitleHas(w, term));
      container.innerHTML = works.length ? _renderAuthorWorks(works, order, _renderAuthorWorkOrMissing) : ''; //0 risultati: basta il testo sopra
      _setAuthorListStatus(term ? `${plural(works.length)} with “${term}” in the title`
        : role === 'all' ? plural(all.length) + missingNote : `${works.length} of ${plural(all.length)}`, null);
    };
    _initAuthorSearch(value => { term = value; show(); });
    document.querySelectorAll('#ra-sort button').forEach(button => {
      button.disabled = false; //i bottoni diventano utilizzabili
      button.addEventListener('click', () => {
        document.querySelectorAll('#ra-sort button').forEach(b => b.classList.toggle('active', b === button));
        order = button.dataset.order;
        show();
      });
    });

    // filtro per ruolo: solo se la persona è autore di alcune opere ed editor di altre
    const count = r => all.filter(w => _raPersonRoles(w).has(r)).length;
    const counts = { all: all.length, author: count('author'), editor: count('editor') };
    const filter = document.getElementById('ra-role');
    if (!filter || !counts.author || !counts.editor) return;
    filter.querySelectorAll('button').forEach(button => {
      button.querySelector('.ra-role-count').textContent = counts[button.dataset.role];
      button.addEventListener('click', () => {
        filter.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button));
        role = button.dataset.role;
        show();
      });
    });
    filter.classList.remove('d-none');
  });
}

// "Search in titles" of the author profile: the works are all in the page
// already, so it filters them here (no request), together with the sort and
// the role filter; every word must be in the title (upper or lower case
// alike), as typed. Enabled when every work has arrived; onSearch(words),
// '' = all the works again ("Show all" or an empty search).
function _initAuthorSearch(onSearch) {
  const form = document.getElementById('ra-search');
  const input = document.getElementById('ra-search-input');
  const reset = document.getElementById('ra-search-reset');
  if (!form || !input || !reset) return;
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  const search = value => {
    reset.classList.toggle('d-none', !value);
    onSearch(value);
  };
  reset.addEventListener('click', () => {
    input.value = '';
    search('');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    search(_skgifSafeTerm(input.value));
  });
}

// The title of a work has every word of `term` (case not considered).
function _raTitleHas(product, term) {
  const title = _skgifProductRawTitle(product).toLowerCase();
  return term.toLowerCase().split(' ').every(word => title.includes(word));
}

// Roles ('author', 'editor', ...) of the person of the profile in a work.
function _raPersonRoles(product) {
  const contributions = _skgifArray(product.contributions);
  return new Set(contributions.filter(c => c && c.by && c.by.local_identifier === _raPersonOmid).map(c => c.role));
}

// Text on the left of the toolbar and progress bar (fraction 0..1, or null
// to hide it).
function _setAuthorListStatus(text, fraction) {
  _skgifListStatus('ra-sort-status', 'ra-progress', text, fraction);
}

// Badge of the author profile: the person is editor of the work.
function _raEditorBadge(roles) {
  return !roles.has('editor') ? '' : roles.has('author') ? 'Author &amp; Editor' : 'Editor';
}

// A work of the list, or the card of a work the API could not give.
function _renderAuthorWorkOrMissing(work) {
  return work._skgifMissing ? _skgifMissingCard('publication') : _skgifWorkCard(work);
}

// HTML of the whole list in the chosen order: the API's order, by
// publication date (works without a date at the end) with a heading for
// each year, or by title. renderCard: the card of one work.
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

// The works in the chosen order: the API's order, by publication date
// (works without a date always at the end) or by title.
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
// ---new_br_any_browser (SKG-IF)---
// Replaces Pietro's SPARQL block on Meta (meta: the document) and his
// ocapi_references() / ocapi_citations() (Index REST + Meta SPARQL on every
// reference/citation) with:
//   /products/<full OMID>                -> every field of the record: title,
//                                           authors, editors and publisher
//                                           (names), type, date, source,
//                                           volume, issue, pages, identifiers
//   cf.cited_by:<OMID> / cf.cites:<OMID> -> References / Citations, asked in
//                                           pages of SKGIF_LIST_PAGE_SIZE; the
//                                           total_items of page 1 are the two
//                                           counters (= Index reference-count
//                                           / citation-count, checked
//                                           2026-10-10)
// Only what /products gives for the document itself (decided 2026-10-17):
// not the editors of the book or venue that contains it (Pietro's query added
// them: here they would be information about the venue).
// Layout of 2026-10-17: the record and the counters + chart side by side, then
// one card with two tabs (References, Citations) of compact cards as in the
// author profile (_skgifWorkCard()), 10 per page, in the API's order
// (no "Sort by", decided 2026-10-17: it needed every result).
// Each list is a _skgifPagedList(): the cards of a page are cut out of the
// pages of SKGIF_LIST_PAGE_SIZE it keeps, so the API is asked once per 50
// results. Up to SKGIF_CHART_AUTO_LOAD citations, all of them are downloaded at once
// (loadAll()) and the "Citations per year" chart is drawn from the same
// pages: list and chart share the requests. Above that, the chart waits for
// its "Load chart" button (SKG-IF has no date filter or sort: the chart
// needs every citing product).
// Requests: 1 (document) + 1 per 50 references + 1 per 50 citations (the
// first page of each list also gives its counter and first cards). The
// document and the two first pages are asked by Lucinda (#api blocks of
// new_br_any_browser.hf, prof's decision 2026-10-19: Lucinda fills the
// record with view functions, post_skgif_document() / post_skgif_total()
// only turn the JSON into tables); the rest by the #callfun. A page of
// 50 that does not arrive is asked again in smaller pages (skgifFetchRange()),
// so one result the API cannot give does not stop the list and the chart.
// Data shown as the API gives it: dates are padded ("2020-01-01" when only
// the year is known).
//
// #callfun args: args[1] = Lucinda.data.main (has the omid_digit of
// "br/{omid_digit}"), see api_search_author_skgif().
// Lucinda opens this page for every br/ that /venues does not have (#api
// check in the main block of new_venue_browser.hf; this template has none).

// Lucinda builds the page when doc_meta, doc_refs and doc_cits have arrived
// (the record, the message and the two counters are already in it): this
// function only shows the record and starts the lists and the chart.
// doc_refs/doc_cits ask page_size=1 (only the counter: a page of 50 asked to a
// cold API can arrive cut and the counter would stay "–", 2026-10-20);
// doc_refs_page/doc_cits_page the first 10 of each list, shown with the page
// (same URL as skgifFirstPage(): no new request); the rest in pages of 50.
function api_document_record_skgif(...args) {
  if (!_lucindaValue('doc_meta', 'found')) return; //nessun documento o richiesta fallita: il messaggio l'ha già messo Lucinda
  const id = _skgifUrlParam(args[1], 'omid_digit').trim();

  const omidUrl = `https://w3id.org/oc/meta/br/${id}`;
  const listSource = filter => `${SKGIF_API}/products?filter=${filter}:${encodeURIComponent(omidUrl)}`;
  const refsSource = listSource('cf.cited_by');
  const citsSource = listSource('cf.cites');

  _initBrTabs();
  _initAuthorListUi(); //"Back to top", come nel profilo autore
  _skgifSetField('br-cits-chart', '<em>Loading...</em>');
  document.getElementById('br-record')?.classList.remove('d-none');

  // first page of 10 = Lucinda's doc_refs_page / doc_cits_page (no new request)
  skgifFirstPage(refsSource, SKGIF_DEFAULT_PAGE_SIZE).then(refsPage => {
    _brList('refs', refsSource, refsPage); //sfogliate pagina per pagina, niente "Sort by"
  });
  skgifFirstPage(citsSource, SKGIF_DEFAULT_PAGE_SIZE).then(citsPage => {
    _skgifListChart(_brList('cits', citsSource, citsPage), { boxId: 'br-cits-chart', noun: 'citation', owner: 'document', label: '# Citations' }); //sotto la soglia scarica tutte le citazioni (anche per la lista), sopra aspetta il bottone
  });
}

// Lucinda #postprocess of doc_meta (new_br_any_browser.hf): /products/<OMID>
// -> one row with the data of the record, no HTML (the view functions below
// build it in the template, as Pietro's post_ocmeta_call() + view functions).
// "" = no value (the template's ifcond(... != null) hides its row).
//   found      "1" when the document exists
//   message    the error shown instead of the record
//   omid       "br/<id>"
//   title, head_line, head_meta   the three lines of the header (_skgifHeaderText())
//   authors, editors, publisher   [{ name, omid }] by rank
//   date, type, volume, issue, pages
//   source     { name, omid, identifiers } of the venue
//   ids        [{ scheme, value }]
function post_skgif_document(res, id) {
  const header = ['found', 'message', 'omid', 'title', 'head_line', 'head_meta', 'authors', 'editors', 'publisher',
    'date', 'type', 'volume', 'issue', 'pages', 'source', 'ids'];
  const omid = `br/${id}`;
  const doc = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; //{} = nessun documento con quell'OMID, null = richiesta fallita
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
    agents('editor'), //solo gli editor del documento
    agents('publisher'),
    String(_skgifProductRawDate(doc) || '').slice(0, 10), //solo la data, senza l'ora
    manifestation.type?.labels?.en || '',
    biblio.volume || '',
    biblio.issue || '',
    _skgifPageRange(biblio, '-'), //come Pietro: una pagina sola se inizio = fine
    venue ? { name: venue.name, omid: _skgifOmid(venue.local_identifier), identifiers: _skgifArray(venue.identifiers) } : '',
    _skgifArray(doc.identifiers).map(i => ({ scheme: i.scheme, value: i.value }))
  ]];
}



// The References / Citations tabs (one list visible at a time).
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

// The References ('refs') or Citations ('cits') list of the document page
// (elements br-refs-list... / br-cits-list..., see _skgifPagedList()).
function _brList(kind, source, first) {
  const noun = kind === 'refs' ? 'reference' : 'citation';
  return _skgifPagedList({
    prefix: `br-${kind}`, source, first, noun,
    emptyMessage: `No ${noun}s found.`,
    statusText: n => _skgifPlural(n, 'document'),
    scrollId: 'br-lists',
    renderCard: _skgifWorkCard
  });
}

/*
################################################################################
# 11. SCHEDA ORGANIZZAZIONE (new_org_browser)
################################################################################
*/
// ---new_org_browser (SKG-IF)---
// New page (Pietro had none). Persons and organisations share the ra/
// prefix: Lucinda tries new_ra_browser first (#api check on /persons in its
// main block) and opens this template for any other ra/ (no check: it is the
// fallback, so an OMID that is neither gets the "No author or organisation"
// message here). Prof's decision 2026-10-19 (type check in Lucinda).
// Same layout as the author profile: the organisation (name, Crossref ID,
// other identifiers, Publications) next to the "Publications per year"
// chart, then the list of its publications. Requests:
//   /organisations/<full OMID>                      -> name, identifiers
//   /products?filter=contributions.by.local_identifier:<OMID>
//                                                   -> its publications, every
//                                                      role (publisher, author)
// SKG-IF on OpenCitations has only name and identifiers (Crossref member
// ID, sometimes) for an organisation: no country, type, ROR or affiliated
// persons. A publisher can have tens of thousands to millions of
// publications (IOS Press 90,253, Elsevier 17.5 million), so the list is
// browsed page by page as on the document page (_skgifPagedList(), no
// "Sort by"), and "Search in titles" asks the API for the publications of
// the organisation with a word in the title (both filters together:
// IOS Press + "semantic" = 559 in 2.4 s, checked 2026-10-17). The chart
// needs every publication: drawn by itself up to SKGIF_CHART_AUTO_LOAD, with
// "Load chart" up to SKGIF_ORG_CHART_MAX, never above.
// Data shown as the API gives it: many publications of a publisher are
// records with only a DOI (41 of the first 50 of IOS Press: no title,
// authors, date), shown as cards "No title" (user's decision 2026-10-17).

// Organisations with more publications than this have no chart (Load chart
// would download them all). Estimated: 100 requests of 50.
const SKGIF_ORG_CHART_MAX = 5000;

// Lucinda #postprocess of the org_meta block (/organisations/<full OMID>):
// data only, the HTML is made by the view functions. head = the name for the
// page header (ra/<id> without an organisation).
function post_skgif_org(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'crossref', 'ids'];
  const omid = `ra/${id}`;
  const org = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; //{} = nessuna organizzazione, null = richiesta fallita
  if (!org?.local_identifier) {
    const message = org ? `No author or organisation with OMID ${omid} available.` : `Resource ${omid} could not be loaded. Try again later.`;
    return [header, ['', message, omid, omid, '', [], []]];
  }
  const ids = _skgifArray(org.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
  const name = (org.name || '').trim() || 'Unknown Organisation';
  return [header, ['true', '', omid, name, name, ids.filter(i => i.scheme === 'crossref'), ids.filter(i => i.scheme !== 'crossref')]];
}

// #callfun of new_org_browser.hf: args[1] = Lucinda.data.main (has the id
// of "ra/{id}"), as api_author_record_skgif(). Name, identifiers and the
// Publications count are Lucinda's; runs after Lucinda has filled the page:
// shows the record, the list (first page = Lucinda's request), the chart and
// "Search in titles".
function api_org_record_skgif(...args) {
  if (!_lucindaValue('org_meta', 'found')) return; //messaggio già scritto da Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = `https://w3id.org/oc/meta/ra/${id}`;
  const works = `${SKGIF_API}/products?filter=contributions.by.local_identifier:${encodeURIComponent(omidUrl)}`;
  _raPersonOmid = omidUrl; //per il ruolo dell'organizzazione in ogni pubblicazione (badge, nome in grassetto)
  document.getElementById('org-record')?.classList.remove('d-none');
  _initAuthorListUi(); //"Back to top"
  _skgifSetField('org-chart', '<em>Loading publications…</em>'); //finché non arriva la prima pagina

  skgifFirstPage(works, SKGIF_DEFAULT_PAGE_SIZE).then(first => { //= org_works_page di Lucinda
    if (first) _skgifFallbackCount('org-count', first.total);
    const allPublications = _orgList(works, first, n => _skgifPlural(n, 'publication'), '');
    _skgifListChart(allPublications, { boxId: 'org-chart', noun: 'publication', owner: 'organisation', label: '# Publications', maxLoad: SKGIF_ORG_CHART_MAX });
    allPublications.onLoaded(() => _initOrgSort(allPublications));
    _initOrgSearch(works, allPublications);
  });
}

// A list of publications of the organisation page (all of them, or the
// result of a title search).
function _orgList(source, first, statusText, emptyMessage) {
  return _skgifPagedList({
    prefix: 'org-pubs', source, first, statusText, emptyMessage,
    noun: 'publication',
    scrollId: 'org-pubs',
    renderCard: product => _skgifWorkCard(product, _orgRoleBadge)
  });
}

// Badge of the organisation page: its roles in the publication
// ("Publisher", "Author", "Publisher & Author"...).
function _orgRoleBadge(roles) {
  const labels = { author: 'Author', editor: 'Editor' }; //"Publisher" no: lo sono quasi tutte
  return Object.keys(labels).filter(role => roles.has(role)).map(role => labels[role]).join(' &amp; ');
}

// "Sort by" of the organisation page (2026-10-20): it needs every
// publication, so it appears only once the list has downloaded them all for
// the chart (by itself up to SKGIF_CHART_AUTO_LOAD, after "Load chart" up to
// SKGIF_ORG_CHART_MAX; never for the biggest publishers). Same orders as the
// author profile (_sortAuthorWorks()), still 10 per page. Hidden during a
// title search (it sorts the full list), back with "Show all".
function _initOrgSort(allPublications) {
  const box = document.getElementById('org-sort-box');
  if (!box) return;
  box.dataset.ready = 'true';
  const reset = document.getElementById('org-search-reset');
  if (!reset || reset.classList.contains('d-none')) box.classList.remove('d-none'); //non durante una ricerca nel titolo
  box.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      box.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button));
      allPublications.sort(button.dataset.order);
    });
  });
}

// "Search in titles": the publications of the organisation with the words
// in the title (one request: contributions.by.local_identifier and
// cf.search.title together), browsed as the full list; "Show all" (or an
// empty search) gives the full list back, with what it had already loaded
// (and its chart, which keeps loading meanwhile).
function _initOrgSearch(works, allPublications) {
  const form = document.getElementById('org-search');
  const input = document.getElementById('org-search-input');
  const reset = document.getElementById('org-search-reset');
  if (!form || !input || !reset) return;
  //disattivato nel template finché non c'è la lista: prima, un clic su Search mandava il form
  //al browser (pagina "browser.html?" senza value = "No template is suitable")
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  let current = ''; //ricerca in corso: una risposta arrivata tardi per una ricerca vecchia non viene mostrata

  const sortBox = document.getElementById('org-sort-box');
  const showAll = () => {
    current = '';
    input.value = '';
    reset.classList.add('d-none');
    if (sortBox?.dataset.ready) sortBox.classList.remove('d-none'); //Sort by ordina la lista completa
    allPublications.activate();
  };
  reset.addEventListener('click', showAll);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const term = _skgifSafeTerm(input.value);
    if (!term) return showAll();
    current = term;
    reset.classList.remove('d-none');
    sortBox?.classList.add('d-none');
    delete _skgifPaginators['org-pubs-list']; //nessuna lista attiva finché non arriva la risposta
    _skgifListStatus('org-pubs-status', 'org-pubs-progress', 'Searching…', null);
    _skgifSetField('org-pubs-list', SKGIF_LOADING_HTML);
    const source = `${works},cf.search.title:${encodeURIComponent(term)}`;
    skgifFirstPage(source, SKGIF_LIST_PAGE_SIZE).then(first => {
      if (current !== term) return;
      _orgList(source, first, n => `${_skgifPlural(n, 'publication')} with “${term}” in the title`, '');
    });
  });
}
