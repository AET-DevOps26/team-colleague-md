import { useState } from 'react';
import styles from './PostBody.module.css';

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
      onClick={handleCopy}
      type="button"
      aria-label="Copy code"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const PATCH_CODE = `from verita.interp import patch_heads, eval_suite

# 1) probe the model with two demonstration formats
clean    = eval_suite(model, suite="mmlu-pro", n_shot=5)
shuffled = eval_suite(model, suite="mmlu-pro", n_shot=5, shuffle=True)

# 2) identify heads whose activation deltas track demo coherence
heads = patch_heads(model, clean, shuffled, threshold=0.4)

# 3) ablate and re-evaluate
score = eval_suite(model, suite="mmlu-pro", n_shot=5,
                   zero_heads=heads)

print(f"clean: {clean:.1f}  ablated: {score:.1f}")
# clean: 62.4  ablated: 41.1`;

export default function PostBody() {
  return (
    <div className={styles.md}>
      <p>
        For the last three years, in-context learning has been the most useful and least understood
        capability of large language models. You show the model a handful of examples, it learns the
        pattern, and it does the task. There is no weight update. There is no obvious place where the
        &ldquo;learning&rdquo; could be happening. And yet it works — sometimes startlingly well,
        sometimes inexplicably not at all.
      </p>

      <p>
        In this paper we present mechanistic evidence that few-shot learning in 70B-class models is
        implemented by a specific, localizable circuit: a population of attention heads we call{' '}
        <strong>skill induction heads</strong>. We characterise the circuit, ablate it, and show that
        without it, in-context learning collapses to chance-above-baseline.
      </p>

      <h2>What we found</h2>

      <p>
        Across two open-weights 70B models and one frontier closed model accessed via logit lens, we
        identify roughly 140 attention heads — concentrated in <code>layers 18–32</code> — that
        activate selectively when the model is presented with a coherent in-context task.
      </p>

      <p>The heads are <em>not</em> activated by:</p>
      <ul>
        <li>shuffled demonstrations (same tokens, random order)</li>
        <li>label-corrupted demonstrations (right format, wrong labels)</li>
        <li>off-task demonstrations (right labels for a different problem)</li>
      </ul>

      <p>
        They <em>are</em> activated by anything the model can plausibly use as a worked example —
        even if the example is in a language the model has never been finetuned on, even if the
        format is unusual, even if the demonstration is presented as a comment in a code block.
      </p>

      <figure className={styles.figure}>
        <div className={styles.figBox}>
          <svg viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <rect width="680" height="280" fill="#F9F9F9" />
            <line x1="60" y1="240" x2="640" y2="240" stroke="#D4D4D4" strokeWidth="1" />
            <line x1="60" y1="40" x2="60" y2="240" stroke="#D4D4D4" strokeWidth="1" />
            <g fontFamily="JetBrains Mono" fontSize="9.5" fill="#ABABAB">
              <text x="60" y="258">L0</text>
              <text x="200" y="258">L16</text>
              <text x="340" y="258">L32</text>
              <text x="480" y="258">L48</text>
              <text x="620" y="258">L64</text>
            </g>
            <g fontFamily="JetBrains Mono" fontSize="9.5" fill="#ABABAB" textAnchor="end">
              <text x="54" y="244">0</text>
              <text x="54" y="180">16</text>
              <text x="54" y="116">32</text>
              <text x="54" y="52">48</text>
            </g>
            <g stroke="#EBEBEB" strokeWidth="0.5">
              <line x1="60" y1="180" x2="640" y2="180" />
              <line x1="60" y1="116" x2="640" y2="116" />
              <line x1="60" y1="52" x2="640" y2="52" />
            </g>
            {/* Skill induction cluster annotation */}
            <rect x="200" y="60" width="180" height="170" fill="none" stroke="#0a0a0a" strokeWidth="1.2" strokeDasharray="3 3" />
            <text x="290" y="54" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#0a0a0a" textAnchor="middle">Skill induction cluster · 138 heads</text>
            <text x="290" y="248" fontFamily="Inter" fontSize="10" fill="#6B6B6B" textAnchor="middle">layer index →</text>
            <text x="20" y="140" fontFamily="Inter" fontSize="10" fill="#6B6B6B" transform="rotate(-90 20 140)" textAnchor="middle">head index →</text>
            {/* Legend */}
            <g transform="translate(490 60)">
              <rect width="130" height="62" fill="#fff" stroke="#EBEBEB" rx="6" />
              <circle cx="14" cy="18" r="3.5" fill="#0a0a0a" opacity="0.9" />
              <text x="24" y="21" fontFamily="Inter" fontSize="10" fill="#0a0a0a">selective (high)</text>
              <circle cx="14" cy="36" r="3" fill="#0a0a0a" opacity="0.5" />
              <text x="24" y="39" fontFamily="Inter" fontSize="10" fill="#6B6B6B">selective (mid)</text>
              <circle cx="14" cy="52" r="2" fill="#ABABAB" opacity="0.6" />
              <text x="24" y="55" fontFamily="Inter" fontSize="10" fill="#6B6B6B">background</text>
            </g>
          </svg>
        </div>
        <figcaption className={styles.figcaption}>
          fig 3 · head-level selectivity for in-context demonstrations · llama-3 70B
        </figcaption>
      </figure>

      <h2>How we tested it</h2>

      <p>
        The core experimental claim is an ablation. We zero out the output of a head, hold everything
        else fixed, and measure the change in few-shot performance. The result, on a panel of seven
        downstream tasks:
      </p>

      <div className={styles.statsTable}>
        <div className={`${styles.cell} ${styles.head}`}>Task</div>
        <div className={`${styles.cell} ${styles.head}`}>5-shot base</div>
        <div className={`${styles.cell} ${styles.head}`}>Head-cluster ablated</div>
        <div className={`${styles.cell} ${styles.head}`}>Δ</div>

        <div className={styles.cell}>MMLU-Pro</div>
        <div className={`${styles.cell} ${styles.mono}`}>62.4</div>
        <div className={`${styles.cell} ${styles.mono}`}>41.1</div>
        <div className={`${styles.cell} ${styles.mono} ${styles.deltaDown}`}>−21.3</div>

        <div className={styles.cell}>GSM8K</div>
        <div className={`${styles.cell} ${styles.mono}`}>81.0</div>
        <div className={`${styles.cell} ${styles.mono}`}>52.7</div>
        <div className={`${styles.cell} ${styles.mono} ${styles.deltaDown}`}>−28.3</div>

        <div className={styles.cell}>AIME 2024</div>
        <div className={`${styles.cell} ${styles.mono}`}>28.1</div>
        <div className={`${styles.cell} ${styles.mono}`}>11.4</div>
        <div className={`${styles.cell} ${styles.mono} ${styles.deltaDown}`}>−16.7</div>

        <div className={styles.cell}>BBH (avg)</div>
        <div className={`${styles.cell} ${styles.mono}`}>71.6</div>
        <div className={`${styles.cell} ${styles.mono}`}>59.0</div>
        <div className={`${styles.cell} ${styles.mono} ${styles.deltaDown}`}>−12.6</div>

        <div className={`${styles.cell} ${styles.lastRow}`}>HumanEval</div>
        <div className={`${styles.cell} ${styles.mono} ${styles.lastRow}`}>76.8</div>
        <div className={`${styles.cell} ${styles.mono} ${styles.lastRow}`}>73.5</div>
        <div className={`${styles.cell} ${styles.mono} ${styles.deltaDown} ${styles.lastRow}`}>−3.3</div>
      </div>

      <p>
        The effect is largest on tasks that require <em>compositional</em> reasoning over the
        demonstration (GSM8K, MMLU-Pro), smaller on tasks where the demonstration mainly anchors
        output format (HumanEval). This is consistent with the &ldquo;skill induction&rdquo; framing:
        when there is no skill to induce — just a format to match — the heads matter less.
      </p>

      <p>
        Crucially, ablating the same heads has <strong>almost no effect</strong> on zero-shot
        performance. The model is not relying on these heads to know things; it is relying on them to
        learn from things you just showed it.
      </p>

      <h2>A minimal probe</h2>

      <p>
        Below is a 14-line patching harness. If you have model internals and a tokenizer, you can
        reproduce the headline number for any 70B-class model in roughly twelve minutes.
      </p>

      <div className={styles.codeBlock}>
        <CopyButton code={PATCH_CODE} />
        <pre>
          <code>
            <span className={styles.kw}>from</span>{' '}
            <span className={styles.nm}>verita.interp</span>{' '}
            <span className={styles.kw}>import</span>{' '}
            <span className={styles.fn}>patch_heads</span>,{' '}
            <span className={styles.fn}>eval_suite</span>
            {'\n\n'}
            <span className={styles.cm}># 1) probe the model with two demonstration formats</span>
            {'\n'}
            {'clean    = '}
            <span className={styles.fn}>eval_suite</span>
            {'(model, suite='}
            <span className={styles.st}>&quot;mmlu-pro&quot;</span>
            {', n_shot='}
            <span className={styles.st}>5</span>
            {')\n'}
            {'shuffled = '}
            <span className={styles.fn}>eval_suite</span>
            {'(model, suite='}
            <span className={styles.st}>&quot;mmlu-pro&quot;</span>
            {', n_shot='}
            <span className={styles.st}>5</span>
            {', shuffle='}
            <span className={styles.st}>True</span>
            {')\n\n'}
            <span className={styles.cm}># 2) identify heads whose activation deltas track demo coherence</span>
            {'\n'}
            {'heads = '}
            <span className={styles.fn}>patch_heads</span>
            {'(model, clean, shuffled, threshold='}
            <span className={styles.st}>0.4</span>
            {')\n\n'}
            <span className={styles.cm}># 3) ablate and re-evaluate</span>
            {'\n'}
            {'score = '}
            <span className={styles.fn}>eval_suite</span>
            {'(model, suite='}
            <span className={styles.st}>&quot;mmlu-pro&quot;</span>
            {', n_shot='}
            <span className={styles.st}>5</span>
            {',\n                   '}
            <span className={styles.fn}>zero_heads</span>
            {'=heads)\n\n'}
            <span className={styles.kw}>print</span>
            {'('}
            <span className={styles.st}>f&quot;clean: {'{clean:.1f}'}  ablated: {'{score:.1f}'}&quot;</span>
            {')\n'}
            <span className={styles.cm}># clean: 62.4  ablated: 41.1</span>
          </code>
        </pre>
      </div>

      <p>
        The script and our checkpoint hashes are in the repo. If you reproduce, please file an issue
        with your environment — we&rsquo;re collecting a leaderboard of head-counts across models,
        and the data is starting to look like a phase diagram.
      </p>

      <h2>What this isn&rsquo;t</h2>

      <p>
        This is <em>not</em> a claim that we understand in-context learning. We have localized a
        circuit that is necessary for it; we have not shown that the circuit is sufficient, and we
        cannot yet predict from weights alone which heads will become skill-induction heads during
        training.
      </p>

      <blockquote>
        The honest version is: we can now point at the place where the magic happens. We still
        don&rsquo;t know what the magic is.
      </blockquote>

      <p>
        That said — pointing matters. For the first time, the field has a falsifiable target. We
        expect the next year of mechanistic interpretability work to refine, contest, and extend the
        picture we&rsquo;re sketching here. The point of this paper is not to be right. The point is
        to be specific enough to be wrong.
      </p>
    </div>
  );
}
