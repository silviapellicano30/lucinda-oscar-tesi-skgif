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
================================================================================
SILVIA PELLICANO - MIGRAZIONE SKG-IF
Tutto il codice SOTTO questa riga e' mio (migrazione alle API SKG-IF di
OpenCitations). Tutto il codice SOPRA e' l'implementazione originale di
Pietro Tisci, lasciata invariata.
================================================================================
================================================================================
*/

/*
################################################################################
# 1. CONFIGURAZIONE ENDPOINT SKG-IF + PAGINAZIONE (condivisa tra le risorse)
################################################################################
*/
/*
--------------------------------
SKG-IF ENDPOINT CONFIGURATION
--------------------------------
Registers how LUCINDA talks to the OpenCitations SKG-IF REST API
(GET + JSON, instead of the default SPARQL GET/POST handling in lucinda.js).
*/
Lucinda.add_endpoint_handler({
  id: "https://api.opencitations.net/skg-if/v1/persons",
  requests: {
    get: {
      url_param: "?[[sparql]]",
      args: {
        headers: {
          "Accept": "application/json"
        },
        method: "GET"
      },
      success_controller: "reqhandler_skgif_persons"
    }
  }
});

/*
--------------------------------
SKG-IF GENERIC PAGINATION (reusable across resources)
--------------------------------
SKG-IF search endpoints default to 10 results per page (max 50), and
already handle the slicing/counting themselves - we don't need our own
result-limiting logic, just a small UI to move between pages. This module
is resource-agnostic: aut_free_text uses it today, doc_free_text and
venue_free_text can reuse it unchanged by giving their own containerId,
buildFetchUrls and renderItem.

A single delegated click listener (registered once, here) drives every
paginated results container, instead of one inline onclick per search -
that's what makes this reusable without name clashes between resources.
*/
const SKGIF_DEFAULT_PAGE_SIZE = 10; // matches the API's own default; not sent as a query param unless overridden

const _skgifPaginators = {};

/*
Cache of SKG-IF responses already received in this page, keyed by their
normalized page URL. The API always echoes the full page URL in
meta.local_identifier (with &page=1&page_size=10 even when the request had
none), so the response fetched by the .hf block (needed anyway: LUCINDA only
renders the template after a #sparql block completes) is stored here by its
success controller and reused for page 1 instead of being fetched again.
Responses fetched by the paginator are stored too, so going back to an
already visited page costs no request.
*/
const _skgifResponseCache = {};

function _skgifNormalizeUrl(url) {
  let u = String(url || "").replace(/\+/g, " ");
  try { u = decodeURIComponent(u); } catch (e) { /* keep as is */ }
  return u.trim().toLowerCase();
}

function skgifCacheResponse(data, url) {
  const key = _skgifNormalizeUrl(url || data?.meta?.local_identifier);
  if (key) _skgifResponseCache[key] = data;
}

document.addEventListener('click', function (e) {
  const btn = e.target.closest('.skgif-page-btn');
  if (!btn || btn.disabled) return;
  const paginator = _skgifPaginators[btn.dataset.skgifContainer];
  const page = parseInt(btn.dataset.skgifPage, 10);
  if (paginator && page >= 1) paginator.goToPage(page);
});

/*
config:
  containerId   - id of the element the results (and pagination bar) render into
  buildFetchUrls(page, pageSize) -> array of SKG-IF URLs to fetch for that page
                  (more than one only when merging results from multiple filters,
                  e.g. a single free-text term searched as given_name OR family_name)
  dedupeKey(item) -> a string key used to drop duplicates across buildFetchUrls' URLs
  renderItem(item) -> HTML string for one result card
  emptyMessage   - optional text shown when a page has zero results
  pageSize       - optional, defaults to SKGIF_DEFAULT_PAGE_SIZE
  totalCountId   - optional id of the element showing the results count in the
                   page title; overwritten with the same total the pagination
                   uses, so title and "Page X of Y" always agree
*/
function createSkgifPaginatedSearch(config) {
  const pageSize = config.pageSize || SKGIF_DEFAULT_PAGE_SIZE;

  function fetchPage(page) {
    const container = document.getElementById(config.containerId);
    if (container) {
      container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading...</p></div>';
    }

    const emptyResponse = { "@graph": [], meta: { part_of: { total_items: 0 } } };
    const safeFetch = (url) => {
      const cached = _skgifResponseCache[_skgifNormalizeUrl(url)];
      if (cached) return Promise.resolve(cached);
      return fetch(url)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return emptyResponse;
          skgifCacheResponse(data, url);
          return data;
        })
        .catch(() => emptyResponse);
    };

    const urls = config.buildFetchUrls(page, pageSize);

    Promise.all(urls.map(safeFetch))
      .then(responses => {
        const seen = new Set();
        const items = [];
        let totalItems = 0;

        responses.forEach(resp => {
          const graph = Array.isArray(resp?.["@graph"]) ? resp["@graph"] : [];
          totalItems = Math.max(totalItems, resp?.meta?.part_of?.total_items || 0);
          graph.forEach(item => {
            const key = config.dedupeKey(item);
            if (seen.has(key)) return;
            seen.add(key);
            items.push(item);
          });
        });

        // buildFetchUrls may hit more than one endpoint (e.g. a single free-
        // text term searched as given_name OR family_name) and get merged
        // above - cap to pageSize here so a "page" is always what it says,
        // regardless of how many sources contributed to it.
        if (config.totalCountId) {
          const countEl = document.getElementById(config.totalCountId);
          if (countEl) countEl.textContent = totalItems;
        }

        _render(container, items.slice(0, pageSize), page, totalItems);
      })
      .catch(error => {
        console.error("SKG-IF search failed:", error);
        if (container) container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error: ${error.message}</div></div>`;
      });
  }

  function _render(container, items, page, totalItems) {
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="col-12"><p>${config.emptyMessage || 'No results found.'}</p></div>`;
      return;
    }

    // container is already a Bootstrap .row (see aut_free_text.html); an
    // extra nested .row here caused the horizontal scrollbar bug (negative
    // row margins compounding), so we render the .col-* items directly.
    let html = items.map(config.renderItem).join('');

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const prevBtn = page > 1
      ? `<button type="button" class="btn btn-outline-secondary skgif-page-btn" data-skgif-page="${page - 1}" data-skgif-container="${config.containerId}">&laquo; Previous</button>`
      : `<span></span>`;
    const nextBtn = page < totalPages
      ? `<button type="button" class="btn btn-outline-primary skgif-page-btn" data-skgif-page="${page + 1}" data-skgif-container="${config.containerId}">Next &raquo;</button>`
      : `<span></span>`;

    html += `
      <div class="col-12">
        <nav class="skgif-pagination" aria-label="Search results pages">
          ${prevBtn}
          <span class="skgif-page-info">Page ${page} of ${totalPages}</span>
          ${nextBtn}
        </nav>
      </div>`;

    container.innerHTML = html;
  }

  const paginator = { goToPage: fetchPage };
  _skgifPaginators[config.containerId] = paginator;
  return { search: () => fetchPage(1) };
}

/*
################################################################################
# 2. RICERCA AUTORI (aut_free_text)
################################################################################
*/
// ---aut_free_text (SKG-IF)---
// Converts a SKG-IF /persons response (JSON-LD "@graph") into the
// [header, ...rows] matrix format expected by Lucinda.postprocess().
// total_items (the real total match count, independent of page_size) is
// denormalized onto every row so it survives Lucinda.postprocess()'s
// column-filtering step - see post_search_ids_skgif() below, which reads
// it back out for pagination.
Lucinda.reqhandler_skgif_persons = function (data) {
  skgifCacheResponse(data); // reused by api_search_author_skgif() for page 1
  const header = ["local_identifier", "name", "given_name", "family_name", "orcid", "other_ids", "total_items"];
  const graph = (data && Array.isArray(data["@graph"])) ? data["@graph"] : [];
  const totalItems = String(data?.meta?.part_of?.total_items ?? 0);

  const rows = graph.map(person => {
    const identifiers = Array.isArray(person.identifiers) ? person.identifiers : [];
    const orcid = identifiers.find(i => i.scheme === "orcid")?.value || "";
    const otherIds = identifiers
      .filter(i => i.scheme !== "orcid")
      .map(i => `${i.scheme}:${i.value}`)
      .join("|");

    return [
      person.local_identifier || "",
      person.name || "",
      person.given_name || "",
      person.family_name || "",
      orcid,
      otherIds,
      totalItems
    ];
  });

  return [header, ...rows];
};

// ---aut_free_text (SKG-IF)---
// Builds the SKG-IF "filter=..." clause for the search_ids bootstrap call.
// NOTE: cf.search.name does NOT work against the real API (persons only
// have given_name/family_name, verified live: always 0 results), and a
// single request can't OR given_name/family_name together (comma = AND).
// So here we use a simple heuristic for the count: a single term is
// assumed to be a family name, 2+ terms are "given... family". The
// api_search_author_skgif() callfun below additionally covers the
// single-term "could also be a given name" case for the actual results.
// Must return a plain OBJECT, not an array: in the actual engine copy
// loaded by browser.html (example/oc/static/js/lucinda.js), the
// Array.isArray(newValues) branch in Lucinda.preprocess() is empty (a
// leftover stub) - only the "typeof newValues === 'object'" branch
// actually writes the value back into param (see pre_oci() above for the
// same convention already in use).
function pre_search_authors_skgif(search_query) {
  if (typeof search_query !== 'string') return { search_query: '' };

  let clean;
  try {
    clean = decodeURIComponent(search_query).trim();
  } catch (e) {
    clean = search_query.replace(/%20/g, ' ').trim();
  }

  const terms = clean.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return { search_query: '' };

  let filterExpr;
  if (terms.length === 1) {
    filterExpr = `cf.search.family_name:${encodeURIComponent(terms[0])}`;
  } else {
    const family = encodeURIComponent(terms[terms.length - 1]);
    const given = encodeURIComponent(terms.slice(0, -1).join(' '));
    filterExpr = `cf.search.given_name:${given},cf.search.family_name:${family}`;
  }

  return { search_query: filterExpr };
}

// ---aut_free_text (SKG-IF)---
// Aggregates the per-person rows coming from reqhandler_skgif_persons into
// a single row, following the same convention used across this file (e.g.
// post_ocmeta_call's "; "-joined columns). total_items is the same value
// on every input row (denormalized by reqhandler_skgif_persons), so it's
// read once as a plain number rather than pipe-joined - it feeds
// getVal(search_ids.total_items) in aut_free_text.html for the real
// result count (independent of the page_size cap on this bootstrap call).
function post_search_ids_skgif(args) {
  const header = ["ids", "names", "given_names", "family_names", "orcids", "ids_extra", "total_items"];

  if (!Array.isArray(args) || args.length <= 1) {
    return [header, ["", "", "", "", "", "", "0"]];
  }

  const rows = args.slice(1);

  const ids = [];
  const names = [];
  const givenNames = [];
  const familyNames = [];
  const orcids = [];
  const idsExtra = [];

  rows.forEach(row => {
    const rawId = row[0] || "";
    const match = rawId.match(/ra\/([\w\d]+)$/);
    const shortId = match ? match[1] : rawId;

    ids.push(shortId);
    names.push(row[1] || "");
    givenNames.push(row[2] || "");
    familyNames.push(row[3] || "");
    orcids.push(row[4] || "");
    idsExtra.push(row[5] || "");
  });

  const totalItems = rows[0][6] || "0";

  return [
    header,
    [
      ids.join("|"),
      names.join("|"),
      givenNames.join("|"),
      familyNames.join("|"),
      orcids.join("|"),
      idsExtra.join("|"),
      totalItems
    ]
  ];
}

// ---aut_free_text (SKG-IF)---
// #callfun args are (per the convention documented near ocapi_citations()
// below): args[0] = declared-params header, args[1] = Lucinda.data.main
// (has search_query), args[2] = this block's own id.
//
// SKG-IF's convenience filters can't OR given_name/family_name together in
// one request (comma = AND, verified live against the real API), so a
// single free-text term is searched against BOTH fields in parallel here
// and the results are merged/deduplicated by local_identifier - this is
// what actually satisfies "full name, given name, or family name" from the
// user's requirements. For 2+ terms we assume "given... family" order.
// SKG-IF already returns full person metadata (name, ORCID, ...) in the
// search response itself, so there's no need for OpenCitations Meta at all.
//
// Pagination is delegated to createSkgifPaginatedSearch() above (shared,
// resource-agnostic). A single free-text term hits two independent
// paginated endpoints (given_name and family_name) that get merged and
// deduplicated, so a "page" here can show anywhere from ~10 to ~20 cards -
// a known simplification (SKG-IF has no cross-field OR), and total_items
// is approximated as the larger of the two endpoints' totals.
function api_search_author_skgif(...args) {
  const lucinda_main_data = args[1] || {};

  let rawQuery = lucinda_main_data.search_query || "";
  rawQuery = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;

  let cleanQuery;
  try {
    cleanQuery = decodeURIComponent(rawQuery).trim();
  } catch (e) {
    cleanQuery = String(rawQuery).replace(/%20/g, ' ').trim();
  }

  const resultsContainer = document.getElementById('search-results-container');
  if (!cleanQuery) {
    if (resultsContainer) resultsContainer.innerHTML = '<div class="col-12"><p>No results found.</p></div>';
    return;
  }

  const terms = cleanQuery.split(/\s+/).filter(Boolean);
  const base = "https://api.opencitations.net/skg-if/v1/persons";

  const paginator = createSkgifPaginatedSearch({
    containerId: 'search-results-container',
    totalCountId: 'search-total-count',
    buildFetchUrls(page, pageSize) {
      if (terms.length === 1) {
        const term = encodeURIComponent(terms[0]);
        return [
          `${base}?filter=cf.search.given_name:${term}&page=${page}&page_size=${pageSize}`,
          `${base}?filter=cf.search.family_name:${term}&page=${page}&page_size=${pageSize}`
        ];
      }
      const family = encodeURIComponent(terms[terms.length - 1]);
      const given = encodeURIComponent(terms.slice(0, -1).join(' '));
      return [`${base}?filter=cf.search.given_name:${given},cf.search.family_name:${family}&page=${page}&page_size=${pageSize}`];
    },
    dedupeKey: person => person.local_identifier || JSON.stringify(person),
    renderItem: _renderAuthorCard
  });

  paginator.search();
}

function _renderAuthorCard(person) {
  const rawId = person.local_identifier || "";
  const match = rawId.match(/ra\/([\w\d]+)$/);
  const shortId = match ? match[1] : rawId;
  if (!shortId) return "";

  const identifiers = Array.isArray(person.identifiers) ? person.identifiers : [];
  const orcidVal = identifiers.find(i => i.scheme === "orcid")?.value || "";

  const fullname = (person.name || "").trim()
    || `${person.given_name || ""} ${person.family_name || ""}`.trim()
    || "Unknown Name";

  const orcidHtml = orcidVal
    ? `<a href="https://orcid.org/${orcidVal}" target="_blank" class="text-dark text-decoration-none">${orcidVal}</a>`
    : '<span class="text-muted p-4"><em>No ORCID found</em></span>';

  const linkUrl = `browser.html?value=ra/${shortId}`;

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="${linkUrl}" target="_blank">${fullname}</a>
          </h5>
          <hr>

          <div class="mb-2">
            <span class="metadata-label fw-bold">ORCID:</span><br>
            <span>${orcidHtml}</span>
          </div>

          <div class="mb-2">
            <span class="metadata-label fw-bold">Other identifiers:</span><br>
            <span><a href="https://w3id.org/oc/meta/ra/${shortId}" target="_blank">omid:ra/${shortId}</a></span>
          </div>
        </div>
      </div>
    </div>`;
}
