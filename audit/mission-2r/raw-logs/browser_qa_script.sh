#!/bin/bash
# MISSION-2R — Agent 4 Browser & Visual QA (v2 — ZWNJ-safe, IIFE evals)
set -u
ROOT=/home/z/my-project/work/riazi-yar-six
SHOTS=$ROOT/audit/mission-2r/screenshots
EV=$ROOT/audit/mission-2r/browser-evidence
RAW=$ROOT/audit/mission-2r/raw-logs
EVFILE=$EV/dom_evidence.jsonl
: > "$EVFILE"

# ابزار کلیک با نرمال‌سازی ZWNJ — هر eval خودکفاست (scope ایزولهٔ Playwright)
click_eval() { # $1 = regex JS literal
  agent-browser eval "(()=>{const norm=(s)=>(s||'').replace(/[\u200C\u200F\u200E]/g,'');const re=$1;const b=Array.from(document.querySelectorAll('button')).find(x=>re.test(norm(x.textContent))||re.test(norm(x.getAttribute('aria-label'))));if(b){b.click();return 'clicked:'+norm(b.textContent).slice(0,40);}return 'NOT-FOUND';})()"
}

nav() {
  click_eval "/^درس.{0,3}نامه و تمرین\$/" > /dev/null; sleep 0.7
  click_eval "/فصل ۶/" > /dev/null; sleep 0.7
  click_eval "/درصد و کاربردهای آن/" > /dev/null; sleep 1.0
}

submit_q() { # $1=testid
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-$1]');if(!el)return 'NO-CARD';const b=Array.from(el.querySelectorAll('button')).find(x=>(x.textContent||'').includes('بررسی و تصحیح'));if(!b)return 'NO-SUBMIT';b.click();return 'submitted';})()"
}

overflow_check() {
  agent-browser eval "(()=>{return JSON.stringify({vp: window.innerWidth+'x'+window.innerHeight, docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth, hasHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, q623: !!document.querySelector('[data-testid=question-q623]'), q622: !!document.querySelector('[data-testid=question-q622]')});})()"
}

q623_dom() {
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623]');if(!el)return 'q623-MISSING';const p=el.querySelector('p.font-bold');const opts=Array.from(el.querySelectorAll('[role=radio] span.flex-1')).map(s=>s.textContent);const fb=el.querySelector('[data-testid=feedback]');return JSON.stringify({prompt:p.textContent, prompt_wrapped_15pct: p.textContent.includes('\u2066\u06F1\u06F5\u066A\u2069'), bare_400k_unwrapped: !p.textContent.includes('\u2066\u06F4\u06F0\u06F0\u066C\u06F0\u06F0\u06F0\u2069'), option_texts: opts});})()"
}

q623_feedback_dom() {
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623] [data-testid=feedback]');if(!el)return 'no-feedback';const t=el.textContent;return JSON.stringify({is_correct_msg: t.includes('آفرین'), wrapped_math_run_present: t.includes('\u2066\u06F8\u06F5\u066A \u00D7 \u06F4\u06F0\u06F0\u066C\u06F0\u06F0\u06F0 = \u06F3\u06F4\u06F0\u066C\u06F0\u06F0\u06F0\u2069'), snippet: t.slice(0,180)});})()"
}

for SIZE in "320 720" "390 844" "430 932" "768 1024" "1366 768"; do
  W=$(echo $SIZE | cut -d' ' -f1); H=$(echo $SIZE | cut -d' ' -f2)
  TAG="${W}x${H}"
  echo "=== VIEWPORT $TAG ===" | tee -a "$RAW/browser_qa_run.log"
  agent-browser set viewport $W $H >> "$RAW/browser_qa_run.log" 2>&1
  agent-browser open http://localhost:4173/ >> "$RAW/browser_qa_run.log" 2>&1
  agent-browser wait --load networkidle >> "$RAW/browser_qa_run.log" 2>&1
  agent-browser eval "(()=>{localStorage.clear();return 'cleared';})()" > /dev/null
  agent-browser reload >> "$RAW/browser_qa_run.log" 2>&1
  agent-browser wait --load networkidle >> "$RAW/browser_qa_run.log" 2>&1
  nav
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623]');if(el)el.scrollIntoView({block:'center'});return el?'scrolled':'q623-missing';})()" >> "$RAW/browser_qa_run.log" 2>&1
  sleep 0.6

  overflow_check | sed "s/^/OVERFLOW $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"
  q623_dom | sed "s/^/Q623DOM $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"
  agent-browser screenshot "$SHOTS/q623_area_${TAG}.png" >> "$RAW/browser_qa_run.log" 2>&1

  # q623 → پاسخ درست
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623]');if(!el)return 'NO-CARD';const r=Array.from(el.querySelectorAll('[role=radio]')).find(x=>x.getAttribute('aria-label')==='۳۴۰٬۰۰۰ تومان');if(!r)return 'NO-OPT';r.click();return 'selected';})()" >> "$RAW/browser_qa_run.log" 2>&1
  submit_q q623 >> "$RAW/browser_qa_run.log" 2>&1
  sleep 0.6
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623] [data-testid=feedback]');if(el)el.scrollIntoView({block:'center'});return 'ok';})()" > /dev/null
  agent-browser screenshot "$SHOTS/q623_feedback_${TAG}.png" >> "$RAW/browser_qa_run.log" 2>&1
  q623_feedback_dom | sed "s/^/Q623FB $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"

  # q622 → پاسخ درست
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q622]');if(!el)return 'NO-CARD';el.scrollIntoView({block:'center'});const r=Array.from(el.querySelectorAll('[role=radio]')).find(x=>x.getAttribute('aria-label')==='۲۵٪');if(!r)return 'NO-OPT';r.click();return 'selected';})()" >> "$RAW/browser_qa_run.log" 2>&1
  submit_q q622 >> "$RAW/browser_qa_run.log" 2>&1
  sleep 0.6
  agent-browser screenshot "$SHOTS/q622_feedback_${TAG}.png" >> "$RAW/browser_qa_run.log" 2>&1
  agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q622] [data-testid=feedback]');if(!el)return 'no-q622-feedback';const t=el.textContent;return JSON.stringify({ok: el.textContent.includes('آفرین'), wrapped_fraction_chain: t.includes('\u2066\u06F2\u06F0/\u06F8\u06F0 = \u06F1/\u06F4 = \u06F2\u06F5/\u06F1\u06F0\u06F0\u2069')});})()" | sed "s/^/Q622FB $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"

  # سربرس درس: formulaBox و مثال حل‌شده
  agent-browser eval "(()=>{window.scrollTo(0,0);return 'top';})()" > /dev/null
  sleep 0.5
  agent-browser screenshot "$SHOTS/lesson_top_${TAG}.png" >> "$RAW/browser_qa_run.log" 2>&1
  agent-browser eval "(()=>{return JSON.stringify({math_spans: Array.from(document.querySelectorAll('span.math-expr')).map(s=>s.textContent).slice(0,4), isolate_count_in_body: (document.body.textContent.match(/\u2066/g)||[]).length});})()" | sed "s/^/MATHSPANS $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"

  # متن‌های راهنمایی q623 — سه پله راهنما + اسکرین‌شات (فقط در دو نمای موبایل/دسکتاپ)
  if [ "$TAG" = "390x844" ] || [ "$TAG" = "1366x768" ]; then
    agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623]');if(!el)return 'NO-CARD';el.scrollIntoView({block:'center'});const b=Array.from(el.querySelectorAll('button')).find(x=>(x.getAttribute('aria-label')||'').includes('دریافت راهنمایی'));if(!b)return 'NO-HINT-BTN';b.click();b.click();b.click();return 'hints-open';})()" >> "$RAW/browser_qa_run.log" 2>&1
    sleep 0.6
    agent-browser screenshot "$SHOTS/q623_hints_${TAG}.png" >> "$RAW/browser_qa_run.log" 2>&1
    agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623]');if(!el)return 'NO-CARD';const t=el.textContent;return JSON.stringify({hint1_wrapped_15pct_85pct: t.includes('\u2066\u06F1\u06F5\u066A\u2069') && t.includes('\u2066\u06F8\u06F5\u066A\u2069'), hint3_wrapped_85x4000: t.includes('\u2066\u06F8\u06F5 \u00D7 \u06F4\u066C\u06F0\u06F0\u06F0\u2069'), bare_400k_in_hint2: t.includes('از ۴۰۰٬۰۰۰ برابر')});})()" | sed "s/^/Q623HINTS $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"
  fi
done

# ---------- مسیر واقعی آزمون (Exam) → فصل ۶ → q623 ----------
TAG="390x844-exam"
echo "=== EXAM PATH 390x844 ===" | tee -a "$RAW/browser_qa_run.log"
agent-browser set viewport 390 844 >> "$RAW/browser_qa_run.log" 2>&1
agent-browser open http://localhost:4173/ >> "$RAW/browser_qa_run.log" 2>&1
agent-browser wait --load networkidle >> "$RAW/browser_qa_run.log" 2>&1
agent-browser eval "(()=>{localStorage.clear();return 'cleared';})()" > /dev/null
agent-browser reload >> "$RAW/browser_qa_run.log" 2>&1
agent-browser wait --load networkidle >> "$RAW/browser_qa_run.log" 2>&1
click_eval "/^آزمون$/" >> "$RAW/browser_qa_run.log" 2>&1; sleep 0.7
click_eval "/فصل ۶/" >> "$RAW/browser_qa_run.log" 2>&1; sleep 1.0
agent-browser eval "(()=>{return JSON.stringify({exam_questions: Array.from(document.querySelectorAll('[data-testid]')).map(e=>e.getAttribute('data-testid')).filter(t=>t&&t.startsWith('question-')).slice(0,8)});})()" | sed "s/^/EXAM-QS $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"
agent-browser eval "(()=>{const el=document.querySelector('[data-testid=question-q623]');if(!el)return 'q623-not-in-exam-view';el.scrollIntoView({block:'center'});const p=el.querySelector('p.font-bold');return JSON.stringify({prompt: p.textContent.slice(0,120), has_15pct_isolate: p.textContent.includes('\u2066')});})()" | sed "s/^/EXAM-Q623 $TAG /" | tee -a "$EVFILE" "$RAW/browser_qa_run.log"
agent-browser screenshot "$SHOTS/exam_q623_${TAG}.png" >> "$RAW/browser_qa_run.log" 2>&1
echo "QA-ALL-DONE" | tee -a "$RAW/browser_qa_run.log"
