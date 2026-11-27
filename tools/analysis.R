# Analysis of the load-time measurements made with tools/measurements.html.
# Usage (from the repository root): Rscript tools/analysis.R <folder with the CSV files> [output folder]
# Output: summary tables (CSV) and charts (PNG). Runs repeated in several CSV files are counted once.
#
# Excluded runs: tab hidden or browser offline, pilot session, runs listed in excluded_runs.csv (input folder;
#   columns session_id, round, case_id, measure, reason; empty = all). Counts in excluded_summary.csv.
# Statistics per commit, case and measure (runs "ok", also with a 429: the waits before asking again are part of the time
#   the user waits): median, quartiles, SIQR (Jain, 1991), P10/P90, min, max,
#   mean, sd, cv, runs needed for 10 % accuracy at 95 % confidence. Reliability: outcomes and API errors.
# Interface vs API: api_wait_ms = time with at least one API call open; interface = the rest.
# API calls by type (calls_by_type: endpoint and filter names from the URL, by timing.js): median per case and measure.
# Optional inference: bootstrap 95 % CI of each median; Kruskal-Wallis by time slot, weekday and session,
#   Holm-adjusted (Papadopoulos et al., 2021). Chart lines at 1 s and 10 s: Nielsen (1993).

suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(ggplot2)
  library(tidyr)
})

args <- commandArgs(trailingOnly = TRUE)
in_dir <- if (length(args) >= 1) args[1] else "."
out_dir <- if (length(args) >= 2) args[2] else file.path(in_dir, "analysis")
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

files <- list.files(in_dir, pattern = "^skgif-timing-runs.*\\.csv$", full.names = TRUE)
if (!length(files)) stop("No skgif-timing-runs*.csv file in ", in_dir)

runs <- files |>
  lapply(read_csv, col_types = cols(.default = col_character()), na = "NA") |>
  bind_rows() |>
  distinct(session_id, round, case_id, measure, .keep_all = TRUE) |>
  mutate(
    across(c(round, order_in_round, list_size, hour, duration_s, skgif_calls, index_calls, http_404, http_429,
             http_other_errors, network_errors, truncated_responses, page_splits, api_wait_ms, long_tasks_ms, longest_task_ms,
             heap_peak_mb, items_missing), as.numeric),
    across(c(from_click, tab_hidden, browser_offline, pilot), ~ .x == "TRUE"),
    commit = ifelse(is.na(commit) | commit == "", "unknown", commit),
    timestamp = as.POSIXct(substr(timestamp, 1, 19), format = "%Y-%m-%dT%H:%M:%S"),
    case = factor(case_id, levels = unique(case_id[order(case_group, list_size)]))
  )

# Exclusions: flags of the tool, pilot session, runs listed by hand in excluded_runs.csv.
manual_file <- file.path(in_dir, "excluded_runs.csv")
manual <- if (file.exists(manual_file)) read_csv(manual_file, col_types = cols(.default = col_character()), na = c("", "NA")) else
  tibble(session_id = character(), round = character(), case_id = character(), measure = character(), reason = character())
manual_reason <- function(s, r, c, m) {
  hit <- manual$session_id == s & (is.na(manual$round) | manual$round == r) &
    (is.na(manual$case_id) | manual$case_id == c) & (is.na(manual$measure) | manual$measure == m)
  if (any(hit)) manual$reason[which(hit)[1]] else NA_character_
}
runs <- runs |>
  mutate(manual = unname(mapply(manual_reason, session_id, as.character(round), case_id, measure)),
         excluded = case_when(pilot ~ "pilot session", tab_hidden ~ "tab hidden", browser_offline ~ "browser offline",
                              !is.na(manual) ~ paste("by hand:", manual), TRUE ~ NA_character_))
write_csv(runs |> filter(!is.na(excluded)) |> count(excluded, name = "runs"), file.path(out_dir, "excluded_summary.csv"))
valid <- runs |> filter(is.na(excluded))
ok <- valid |> filter(outcome == "ok") # also with a 429: see runs_with_429 in the reliability table
cat(sprintf("%d files, %d sessions, %d measures (%d excluded: see excluded_summary.csv)\n",
            length(files), n_distinct(runs$session_id), nrow(runs), sum(!is.na(runs$excluded))))

# 95 % confidence interval of the median (percentile bootstrap, 2,000 resamples); none with fewer than 5 runs.
set.seed(1) # same intervals every time the script is run
median_ci <- function(x, level = 0.95, resamples = 2000) {
  if (length(x) < 5) return(tibble(median_ci_low = NA_real_, median_ci_high = NA_real_))
  medians <- replicate(resamples, median(sample(x, replace = TRUE)))
  bounds <- unname(quantile(medians, c((1 - level) / 2, 1 - (1 - level) / 2)))
  tibble(median_ci_low = bounds[1], median_ci_high = bounds[2])
}

# Descriptive statistics of the times.
z <- qnorm(0.975)
r_pct <- 10
times <- ok |>
  group_by(commit, case_group, case_id, measure, from_click) |>
  summarise(
    list_size = suppressWarnings(max(list_size, na.rm = TRUE)),
    n = n(),
    median = median(duration_s),
    median_ci(duration_s), # adds the columns median_ci_low and median_ci_high
    q1 = quantile(duration_s, 0.25), q3 = quantile(duration_s, 0.75),
    iqr = q3 - q1, siqr = iqr / 2,
    p10 = quantile(duration_s, 0.10), p90 = quantile(duration_s, 0.90),
    min = min(duration_s), max = max(duration_s),
    mean = mean(duration_s), sd = sd(duration_s), cv = sd / mean,
    n_needed_10pct = ceiling((100 * z * sd / (r_pct * mean))^2),
    skgif_calls = median(skgif_calls), index_calls = median(index_calls),
    # browsers without the Long Tasks API or performance.memory (not Chrome) leave those columns empty
    api_wait_s = median(api_wait_ms, na.rm = TRUE) / 1000,
    interface_s = round(median(duration_s - api_wait_ms / 1000, na.rm = TRUE), 3),
    api_share = round(median(api_wait_ms / 1000 / duration_s, na.rm = TRUE), 3),
    long_tasks_s = median(long_tasks_ms, na.rm = TRUE) / 1000,
    longest_task_ms = if (all(is.na(longest_task_ms))) NA_real_ else max(longest_task_ms, na.rm = TRUE),
    heap_peak_mb = if (all(is.na(heap_peak_mb))) NA_real_ else max(heap_peak_mb, na.rm = TRUE),
    .groups = "drop"
  ) |>
  mutate(list_size = ifelse(is.finite(list_size), list_size, NA),
         across(c(api_wait_s, interface_s, api_share, long_tasks_s), ~ ifelse(is.nan(.x), NA, .x)))
write_csv(times, file.path(out_dir, "times_summary.csv"))

# Reliability: outcome of every expected measure and API error counters.
reliability <- valid |>
  group_by(commit, case_group, case_id, measure) |>
  summarise(
    runs = n(),
    ok = sum(outcome == "ok"), incomplete = sum(outcome == "incomplete"), timeout = sum(outcome == "timeout"),
    pct_ok = round(100 * ok / runs, 1),
    runs_with_429 = sum(http_429 > 0, na.rm = TRUE),
    http_429 = sum(http_429, na.rm = TRUE), http_other_errors = sum(http_other_errors, na.rm = TRUE),
    network_errors = sum(network_errors, na.rm = TRUE), truncated_responses = sum(truncated_responses, na.rm = TRUE),
    page_splits = sum(page_splits, na.rm = TRUE),
    items_missing = sum(items_missing, na.rm = TRUE),
    .groups = "drop"
  )
write_csv(reliability, file.path(out_dir, "reliability_summary.csv"))

# API calls by type: "products?cf.cites [page_size=1]: 10; products/{id}: 1" split into one row per type; a type missing from a run
# counts 0 in that run. Median, min and max over the runs "ok" of each case and measure.
run_calls <- ok |>
  filter(!is.na(calls_by_type), calls_by_type != "") |>
  select(commit, case_group, case_id, measure, from_click, session_id, round, calls_by_type) |>
  mutate(part = strsplit(calls_by_type, "; ", fixed = TRUE)) |>
  unnest(part) |>
  separate_wider_delim(part, ": ", names = c("call_type", "calls")) |>
  mutate(calls = as.numeric(calls))
if (nrow(run_calls)) {
  calls_by_type <- run_calls |>
    select(-calls_by_type) |>
    complete(nesting(commit, case_group, case_id, measure, from_click, session_id, round), call_type, fill = list(calls = 0)) |>
    group_by(commit, case_group, case_id, measure, from_click, call_type) |>
    summarise(runs = n(), median_calls = median(calls), min_calls = min(calls), max_calls = max(calls), .groups = "drop") |>
    filter(max_calls > 0) |>
    arrange(commit, case_group, case_id, measure, desc(median_calls))
  write_csv(calls_by_type, file.path(out_dir, "calls_by_type_summary.csv"))
}

# Kruskal-Wallis tests per case and measure: do the times differ by time slot (morning < 12, afternoon 12-18,
# evening >= 18), weekday or session? Significant = p_holm < 0.05. Run only with 2+ groups of 3+ runs each.
factors <- ok |>
  mutate(time_slot = cut(hour, c(-Inf, 11, 17, Inf), labels = c("morning", "afternoon", "evening")),
         session = session_id)
kruskal <- bind_rows(lapply(c("time_slot", "weekday", "session"), function(f) {
  factors |>
    mutate(group = as.character(.data[[f]])) |>
    group_by(commit, case_group, case_id, measure, from_click) |>
    group_modify(function(d, key) {
      sizes <- table(d$group)
      d <- d[d$group %in% names(sizes)[sizes >= 3], ]
      if (n_distinct(d$group) < 2) return(tibble())
      test <- kruskal.test(duration_s ~ factor(group), data = d)
      medians <- tapply(d$duration_s, d$group, median)
      tibble(factor = f, groups = n_distinct(d$group), n = nrow(d),
             group_medians = paste(sprintf("%s=%.2f", names(medians), medians), collapse = "; "),
             statistic = unname(test$statistic), df = unname(test$parameter), p_value = test$p.value)
    }) |>
    ungroup()
}))
if (nrow(kruskal)) {
  kruskal <- kruskal |> mutate(p_holm = p.adjust(p_value, method = "holm"), significant = p_holm < 0.05)
  write_csv(kruskal, file.path(out_dir, "kruskal_tests.csv"))
} else {
  cat("Kruskal-Wallis tests skipped: no factor has 2 groups with at least 3 runs each\n")
}

limits <- geom_hline(yintercept = c(1, 10), linetype = "dashed", colour = "grey50")
save_plot <- function(plot, name, height = 6) ggsave(file.path(out_dir, name), plot, width = 10, height = height, dpi = 150)

# 1. Distribution of the time to the page / first results, one box per case.
first <- ok |> filter(measure %in% c("page_shown", "first_results"))
if (nrow(first)) {
  save_plot(ggplot(first, aes(x = case, y = duration_s)) +
    geom_boxplot(outlier.shape = NA) + geom_jitter(width = 0.15, alpha = 0.4, size = 1) + limits +
    facet_wrap(~ case_group, scales = "free_x") +
    labs(title = "Time to the page shown / first results", x = NULL, y = "Seconds",
         caption = "Box = Q1-Q3, line = median; dots = single runs; dashed lines = 1 s and 10 s (Nielsen, 1993)") +
    theme_bw() + theme(axis.text.x = element_text(angle = 30, hjust = 1)), "01_page_times.png")
}

# 2. Download of whole lists: time against the number of items (median and IQR).
lists <- times |> filter(measure %in% c("all_citations", "all_references", "all_publications", "all_person_publications",
                                        "person_citations", "person_citation_chart"), !is.na(list_size), list_size > 0)
if (nrow(lists)) {
  save_plot(ggplot(lists, aes(x = list_size, y = median, colour = measure, shape = from_click)) +
    geom_errorbar(aes(ymin = q1, ymax = q3), width = 0) + geom_point(size = 2.5) + limits +
    scale_x_log10() + scale_y_log10() +
    labs(title = "Time to download a whole list, by size of the list", x = "Items in the list (log scale)",
         y = "Seconds, median and IQR (log scale)", shape = "Load all clicked",
         caption = "Dashed lines = 1 s and 10 s (Nielsen, 1993)") + theme_bw(), "02_time_vs_items.png")
  save_plot(ggplot(lists, aes(x = list_size, y = skgif_calls + index_calls, colour = measure)) +
    geom_point(size = 2.5) + scale_x_log10() + scale_y_log10() +
    labs(title = "API calls needed to download a whole list", x = "Items in the list (log scale)",
         y = "SKG-IF + Index calls, median (log scale)") + theme_bw(), "03_calls_vs_items.png")
}

# 3. Variation over time: median of each session, for every case and measure.
sessions <- ok |>
  group_by(commit, session_id, case_id, measure) |>
  summarise(start = min(timestamp), median = median(duration_s), .groups = "drop")
if (n_distinct(sessions$session_id) > 1) {
  save_plot(ggplot(sessions, aes(x = start, y = median, colour = case_id)) +
    geom_line() + geom_point() + scale_y_log10() + facet_wrap(~ measure, scales = "free_y") +
    labs(title = "Median time of each session", x = "Session start", y = "Seconds (log scale)") +
    theme_bw() + theme(legend.position = "bottom"), "04_time_by_session.png", height = 8)
  save_plot(ggplot(ok |> filter(measure %in% c("page_shown", "first_results")),
                   aes(x = factor(hour), y = duration_s)) +
    geom_boxplot() + scale_y_log10() + facet_wrap(~ case_group) +
    labs(title = "Time to the page shown / first results by hour of the day", x = "Hour", y = "Seconds (log scale)") +
    theme_bw(), "05_time_by_hour.png")
}

# 4. Reliability: share of outcomes per case.
save_plot(ggplot(valid |> count(case, case_group, outcome), aes(x = case, y = n, fill = outcome)) +
  geom_col(position = "fill") + scale_y_continuous(labels = scales::percent) + coord_flip() +
  scale_fill_manual(values = c(ok = "#4d9078", incomplete = "#e0a030", timeout = "#c0392b")) +
  labs(title = "Outcome of the measures", x = NULL, y = "Share of the expected measures", fill = "Outcome") +
  theme_bw(), "06_outcomes.png", height = 7)

# 5. Interface against API: for each case, its slowest measure, split into the time spent waiting for the API
#    (at least one call open) and the time of the interface (the rest), medians.
split <- times |>
  filter(!is.na(api_wait_s)) |>
  group_by(commit, case_group, case_id) |> slice_max(median, n = 1, with_ties = FALSE) |> ungroup() |>
  mutate(case = factor(case_id, levels = levels(ok$case)), api = pmin(api_wait_s, median),
         interface = median - api) |>
  select(commit, case_group, case, measure, Interface = interface, `Waiting for the API` = api) |>
  pivot_longer(c(Interface, `Waiting for the API`), names_to = "part", values_to = "duration_s")
if (nrow(split)) {
  save_plot(ggplot(split, aes(x = case, y = duration_s, fill = part)) + geom_col() + coord_flip() +
    facet_wrap(~ commit) +
    scale_fill_manual(values = c(Interface = "#8f4ec7", `Waiting for the API` = "#c8c8c8")) +
    labs(title = "Where the time goes: interface against waiting for the API",
         x = NULL, y = "Seconds (median of the slowest measure of each case)", fill = NULL,
         caption = "Waiting for the API = at least one call open; interface = the rest (code, drawing, page files)") +
    theme_bw() + theme(legend.position = "bottom"), "07_interface_vs_api.png", height = 7)
}

cat("Written to", normalizePath(out_dir), "\n")
