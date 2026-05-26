import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
};

const TOPICS: SeedTopic[] = [
  // ───────────────────────────────────────────────────────────────
  // Week 1 — Foundations of mathematical notation
  // ───────────────────────────────────────────────────────────────
  {
    slug: "equality-family",
    title: "Equality and its relatives: =, ≠, ≈, ≡",
    weekNumber: 1,
    blurb: "The four shades of 'the same'.",
    lectureTitle: "1.1 The equality family: =, ≠, ≈, ≡",
    body: `# Equality and its relatives

Mathematics has *four* different signs for "is the same as," and they do not mean the same thing.

- $=$ — **equal**. Both sides denote the exact same value. $2 + 2 = 4$.
- $\\neq$ — **not equal**. $3 \\neq 4$.
- $\\approx$ — **approximately equal**. The two sides are close, usually after rounding. $\\pi \\approx 3.14$.
- $\\equiv$ — **identically equal** or **congruent**. Either "equal for all values of the variable" (an identity), or "equal modulo something." $\\sin^2 x + \\cos^2 x \\equiv 1$.

## A science example

In physics, the relativistic energy of a particle is *exactly* $E = \\sqrt{(mc^2)^2 + (pc)^2}$. For a particle at rest ($p = 0$), this collapses to the famous **identity** $E \\equiv mc^2$ — true for every rest mass, not just one. When physicists report a measurement, however, they write $E \\approx 938\\ \\text{MeV}$ for the proton's rest energy, because the measured value is an approximation, not the exact theoretical value.

## Why the distinction matters

Writing $\\pi = 3.14$ on a homework is a small lie. Writing $\\pi \\approx 3.14$ is the truth. The notation tells the reader what kind of claim you are making.`,
  },
  {
    slug: "inequalities-notation",
    title: "Inequalities: <, >, ≤, ≥",
    weekNumber: 1,
    blurb: "Strict and non-strict ordering.",
    lectureTitle: "1.2 Inequality symbols: <, >, ≤, ≥",
    body: `# Inequalities

Where $=$ pins a value, **inequalities** describe a range.

- $a < b$ — $a$ is **strictly less than** $b$. $3 < 5$.
- $a > b$ — $a$ is **strictly greater than** $b$.
- $a \\le b$ — $a$ is **less than or equal to** $b$. The equality case is *included*.
- $a \\ge b$ — $a$ is **greater than or equal to** $b$.

The open mouth always faces the larger number.

## A science example

In thermodynamics, the **second law** states that for an isolated system the entropy change satisfies

$$\\Delta S \\ge 0.$$

The $\\ge$ matters. A *reversible* process saturates the bound ($\\Delta S = 0$); every real-world process is irreversible and yields $\\Delta S > 0$. Replacing $\\ge$ with $>$ would falsely outlaw the idealized reversible case that the whole theory is built on.

## Strict vs. non-strict

In an interval like $[2, 5)$, the square bracket means $\\ge 2$ (included), the round bracket means $< 5$ (excluded). Same idea, different notation.`,
  },
  {
    slug: "plus-minus-proportional",
    title: "Plus-minus and proportional: ±, ∝",
    weekNumber: 1,
    blurb: "Two values in one symbol; 'scales with'.",
    lectureTitle: "1.3 ± and ∝",
    body: `# Plus-minus and proportional

Two compact symbols that pack a lot of meaning.

## $\\pm$ — plus or minus

$\\pm$ means "either of two values." It appears in:

- **Solutions**: $x = \\pm 3$ means $x = 3$ or $x = -3$.
- **The quadratic formula**: $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ — *both* roots in one expression.
- **Measurement uncertainty**: $g = 9.81 \\pm 0.02 \\ \\text{m/s}^2$ — the true value lies (with stated confidence) in the interval.

## $\\propto$ — proportional to

$y \\propto x$ means $y = kx$ for some constant $k$. The constant is hidden; the *shape* of the relationship is what matters.

## A science example

**Newton's law of gravitation** is most cleanly stated proportionally:

$$F \\propto \\frac{m_1 m_2}{r^2}.$$

Inserting the constant gives $F = G\\,\\dfrac{m_1 m_2}{r^2}$. The $\\propto$ form says the *physics* — force grows with the product of masses and falls as the square of distance — without committing to a unit system. When Newton wrote it down, $G$ had not yet been measured. The proportionality was the discovery; the constant was just bookkeeping.`,
  },
  {
    slug: "exponents-notation",
    title: "Exponents and powers: x², xⁿ",
    weekNumber: 1,
    blurb: "Superscripts as repeated multiplication.",
    lectureTitle: "1.4 Exponents: x², xⁿ",
    body: `# Exponents

A small number written above the line — a **superscript** — means repeated multiplication.

$$x^n = \\underbrace{x \\cdot x \\cdots x}_{n \\text{ times}}$$

Special cases everyone needs by reflex:

- $x^2$ — "$x$ squared."
- $x^3$ — "$x$ cubed."
- $x^0 = 1$ (for $x \\neq 0$).
- $x^{-n} = 1/x^n$.
- $x^{1/2} = \\sqrt{x}$.

## A science example

The **kinetic energy** of a moving object is

$$\\text{KE} = \\tfrac{1}{2} m v^2.$$

Doubling the speed *quadruples* the kinetic energy — that's the $v^2$ at work. This is why a car crash at 60 mph is four times as destructive as one at 30 mph, not two. The exponent isn't decoration; it dictates the physics.

## A common pitfall

$-3^2 = -9$, but $(-3)^2 = 9$. The exponent binds tighter than the unary minus, so parentheses change the answer.`,
  },
  {
    slug: "roots-notation",
    title: "Roots: √, ³√",
    weekNumber: 1,
    blurb: "The inverse of raising to a power.",
    lectureTitle: "1.5 Roots: √, ³√, ⁿ√",
    body: `# Roots

The **radical sign** $\\sqrt{\\phantom{x}}$ undoes a power.

- $\\sqrt{x}$ — the (positive) **square root** of $x$. $\\sqrt{25} = 5$.
- $\\sqrt[3]{x}$ — the **cube root**. $\\sqrt[3]{27} = 3$, $\\sqrt[3]{-8} = -2$.
- $\\sqrt[n]{x} = x^{1/n}$ in general.

By convention, $\\sqrt{x}$ denotes only the non-negative root. The equation $x^2 = 25$ has *two* solutions, $x = \\pm 5$, and we usually write the $\\pm$ explicitly.

## A science example

The **period** of a simple pendulum of length $L$ is

$$T = 2\\pi \\sqrt{\\frac{L}{g}}.$$

To double the period, you must *quadruple* the length — because the square root halves any factor you put under it. This is why grandfather clocks are tall: a one-second tick needs roughly a one-meter pendulum, and you cannot shrink it without paying the price under the root.

## Notation note

A cube root has a small "3" tucked into the crook of the radical: $\\sqrt[3]{x}$. The keyboard's $\\sqrt[3]{\\;}$ key inserts exactly this.`,
  },
  {
    slug: "abs-factorial-notation",
    title: "Absolute value and factorial: |x|, n!",
    weekNumber: 1,
    blurb: "Magnitude bars and the multiplicative '!'.",
    lectureTitle: "1.6 |x| and n!",
    body: `# Absolute value and factorial

Two symbols that look like punctuation but are really operators.

## $|x|$ — absolute value

$|x|$ is the **distance from zero**, always non-negative.

$$|x| = \\begin{cases} x & x \\ge 0 \\\\ -x & x < 0 \\end{cases}$$

So $|3| = 3$ and $|-3| = 3$. The bars also denote magnitude of a vector ($|\\vec v|$) or modulus of a complex number ($|z|$).

## $n!$ — factorial

$n!$ is the product of every positive integer from $1$ up to $n$.

$$n! = n \\cdot (n-1) \\cdot (n-2) \\cdots 2 \\cdot 1$$

So $5! = 5 \\cdot 4 \\cdot 3 \\cdot 2 \\cdot 1 = 120$. By convention $0! = 1$.

## A science example

In **statistical mechanics**, the number of ways to arrange $N$ distinguishable particles among themselves is exactly $N!$. For a mole of gas, $N \\approx 6 \\times 10^{23}$, and $N!$ is so astronomical that Boltzmann's entropy formula $S = k_B \\ln(N!)$ requires **Stirling's approximation** $\\ln(N!) \\approx N \\ln N - N$ just to be computable.

Meanwhile $|x|$ shows up whenever a physical quantity is signed but the magnitude is what matters: an electric field's strength is $|\\vec E|$, regardless of which direction the arrow points.`,
  },
  {
    slug: "subscripts-indexing",
    title: "Subscripts: x₀, xᵢ, vₜ",
    weekNumber: 1,
    blurb: "Naming members of a family of related quantities.",
    lectureTitle: "1.7 Subscripts: x₀, xᵢ, vₜ",
    body: `# Subscripts

A **subscript** — a small symbol *below* the line — turns one variable into a whole family.

Common roles:

- **Indices**: $x_1, x_2, x_3, \\dots, x_n$ — the entries of a list.
- **Initial values**: $v_0$ ("vee-nought") — the value of $v$ at time zero.
- **Labels**: $F_{\\text{net}}$ — the net force, as opposed to any particular component.
- **Coordinates**: $v_x, v_y, v_z$ — the $x$-, $y$-, $z$-components of $\\vec v$.
- **Time steps**: $x_t, x_{t-1}, x_{t+1}$ — values at successive moments.

## A science example

**Kinematics** uses subscripts everywhere:

$$v_f = v_0 + a t.$$

Here $v_0$ is the velocity at the start of the motion and $v_f$ is the velocity at the end. Without the subscripts, "$v$" would be ambiguous — *which* velocity? Subscripts let one Greek letter or Latin variable do the work of a whole vocabulary.

In economics, $Y_t$ vs. $Y_{t-1}$ distinguishes this year's GDP from last year's, and the difference $Y_t - Y_{t-1}$ *is* economic growth.`,
  },

  // ───────────────────────────────────────────────────────────────
  // Week 2 — Calculus, change, and accumulation
  // ───────────────────────────────────────────────────────────────
  {
    slug: "sigma-summation",
    title: "Sigma summation: Σ",
    weekNumber: 2,
    blurb: "A compact way to add many terms.",
    lectureTitle: "2.1 Σ — summation notation",
    body: `# Sigma summation

$\\Sigma$ (capital Greek sigma) is the **summation** symbol. It says "add everything you get by stepping the index through this range."

$$\\sum_{i=1}^{n} a_i \\;=\\; a_1 + a_2 + \\cdots + a_n$$

The bottom tells you the **index** and its starting value; the top tells you where to stop. The expression to the right is what gets summed.

## A science example

The **mean** of a dataset of $n$ measurements is

$$\\bar x = \\frac{1}{n}\\sum_{i=1}^{n} x_i.$$

In an experiment with 1000 trials, you do not want to write $x_1 + x_2 + \\cdots + x_{1000}$. The $\\sum$ packages the whole sum into four characters.

Sigma also runs every dot product, every Fourier coefficient, every partition function in thermodynamics — anywhere science adds many small contributions to get one big number, you will find a $\\Sigma$.`,
  },
  {
    slug: "pi-product",
    title: "Product notation: Π",
    weekNumber: 2,
    blurb: "Σ's multiplicative cousin.",
    lectureTitle: "2.2 Π — product notation",
    body: `# Product notation

$\\Pi$ (capital Greek pi) is to multiplication what $\\Sigma$ is to addition.

$$\\prod_{i=1}^{n} a_i \\;=\\; a_1 \\cdot a_2 \\cdots a_n$$

Note: this is **not** the same $\\pi$ as $3.14159\\dots$ Capital $\\Pi$ in product context, lowercase $\\pi$ for the circle constant.

## A science example

In probability, the likelihood of $n$ **independent** observations $x_1, \\dots, x_n$ from a distribution with density $f$ is

$$L(\\theta) = \\prod_{i=1}^{n} f(x_i \\mid \\theta).$$

This is the foundation of **maximum likelihood estimation** — the workhorse of modern statistics and machine learning. Every parameter fit in your favorite stats package is, under the hood, finding the $\\theta$ that maximizes one of these $\\prod$ expressions (or, equivalently, the $\\sum$ of its logarithm).

A second example: $n! = \\prod_{k=1}^{n} k$ — factorial is just a special product.`,
  },
  {
    slug: "delta-change",
    title: "Delta: Δ and δ",
    weekNumber: 2,
    blurb: "Capital Δ for finite change, lowercase δ for an infinitesimal nudge.",
    lectureTitle: "2.3 Δ and δ — change",
    body: `# Delta — the change operator

The Greek letter delta is the universal symbol for *change*.

- $\\Delta x$ (capital) — a **finite, measurable change** in $x$: $\\Delta x = x_2 - x_1$.
- $\\delta x$ (lowercase) — an **infinitesimal** or **virtual** change. Used in calculus of variations, physics, and informal calculus.
- $\\partial x$ — a **partial** change (we will meet $\\partial$ properly soon).

By convention, $\\Delta$ is always read "*change in*" or "*difference of*."

## A science example

**Average velocity** is just the ratio of two deltas:

$$\\bar v = \\frac{\\Delta x}{\\Delta t} = \\frac{x_2 - x_1}{t_2 - t_1}.$$

Shrink $\\Delta t$ all the way down and you get the instantaneous velocity $\\mathrm{d}x/\\mathrm{d}t$ — the derivative. So $\\Delta$ is calculus' starting point: every derivative is a limit of a $\\Delta$.

In chemistry, $\\Delta H$ is the enthalpy change of a reaction, $\\Delta G$ is the change in Gibbs free energy, and the sign of $\\Delta G$ tells you whether the reaction proceeds spontaneously.`,
  },
  {
    slug: "limits-infinity",
    title: "Limits and infinity: lim, →, ∞",
    weekNumber: 2,
    blurb: "Approaching, but not necessarily reaching.",
    lectureTitle: "2.4 lim, →, ∞",
    body: `# Limits and infinity

Three notations conspire to express the central idea of calculus: getting arbitrarily close.

- $\\to$ — "approaches" or "tends to." Read $x \\to 3$ as "$x$ goes to 3."
- $\\lim$ — the **limit** operator. $\\lim_{x \\to a} f(x)$ is the value $f(x)$ approaches as $x$ approaches $a$.
- $\\infty$ — **infinity**. Not a number you can plug in; a shorthand for "grows without bound."

Together:

$$\\lim_{x \\to \\infty} \\frac{1}{x} = 0 \\qquad \\lim_{x \\to 0^+} \\frac{1}{x} = +\\infty.$$

## A science example

The **terminal velocity** of a falling object with linear drag is reached only in the limit:

$$v_{\\text{terminal}} = \\lim_{t \\to \\infty} v(t) = \\frac{mg}{b}.$$

A skydiver never *quite* hits terminal velocity in finite time — they get exponentially close to it. The $\\lim$ is the only honest way to write the asymptote.

Limits also define the derivative ($\\lim_{h \\to 0}$) and the definite integral (a limit of Riemann sums). The arrow is calculus' most-used punctuation mark.`,
  },
  {
    slug: "derivative-notation",
    title: "Derivative notation: d/dx, ∂/∂x",
    weekNumber: 2,
    blurb: "Two different 'd's for two different jobs.",
    lectureTitle: "2.5 d/dx and ∂/∂x",
    body: `# Derivative notation

The derivative — instantaneous rate of change — has two spelling families.

## $\\dfrac{\\mathrm{d}}{\\mathrm{d}x}$ — ordinary derivative

Used when $f$ is a function of **one** variable. Equivalent notations:

$$\\frac{\\mathrm{d}f}{\\mathrm{d}x} \\;\\equiv\\; f'(x) \\;\\equiv\\; \\dot f \\;\\text{(when the variable is time)}.$$

The dot $\\dot f$ is Newton's notation, still used in physics for time derivatives. The fraction $\\mathrm{d}f/\\mathrm{d}x$ is Leibniz's, still used by everyone.

## $\\dfrac{\\partial}{\\partial x}$ — partial derivative

Used when $f$ depends on **several** variables and you want the rate of change holding the others fixed. The "curly d" $\\partial$ is read "del" or "partial."

$$\\frac{\\partial f}{\\partial x}\\bigg|_{y \\text{ fixed}}$$

## A science example

The **heat equation** governs how temperature spreads through a material:

$$\\frac{\\partial T}{\\partial t} = \\alpha \\, \\frac{\\partial^2 T}{\\partial x^2}.$$

$T$ depends on **both** position $x$ and time $t$, so both derivatives are partial. Using a straight $\\mathrm{d}/\\mathrm{d}t$ would be a notational lie — it would claim $T$ has no spatial dependence, gutting the entire equation.`,
  },
  {
    slug: "integral-notation",
    title: "Integrals: ∫, ∫∫, ∮",
    weekNumber: 2,
    blurb: "The 'long S' that adds up infinitely many infinitesimal pieces.",
    lectureTitle: "2.6 Integral signs: ∫, ∫∫, ∮",
    body: `# Integral notation

The integral sign $\\int$ is a stretched **S** — for *sum*. It is the continuous limit of $\\sum$.

- $\\displaystyle\\int_a^b f(x)\\,\\mathrm{d}x$ — **definite integral**: the signed area under $f$ from $a$ to $b$.
- $\\displaystyle\\int f(x)\\,\\mathrm{d}x$ — **indefinite integral**: an antiderivative.
- $\\displaystyle\\iint_D f\\,\\mathrm{d}A$ — **double integral** over a region $D$ in the plane.
- $\\displaystyle\\oint_C \\vec F \\cdot \\mathrm{d}\\vec r$ — **contour integral**: the little circle means "around a closed loop."

The $\\mathrm{d}x$ at the end is **not** decorative — it tells the reader *which variable* is being integrated.

## A science example

**Faraday's law** of electromagnetic induction, in integral form, uses a contour integral:

$$\\oint_C \\vec E \\cdot \\mathrm{d}\\vec\\ell \\;=\\; -\\frac{\\mathrm{d}\\Phi_B}{\\mathrm{d}t}.$$

The $\\oint$ insists the loop be closed: you walk all the way around a wire loop and sum the electric field along the way. Replacing it with a plain $\\int$ would be physically wrong — the law is about *circulation*, which only makes sense around a loop.`,
  },
  {
    slug: "e-ln-log",
    title: "e, ln, and log",
    weekNumber: 2,
    blurb: "Euler's number and its two favorite inverses.",
    lectureTitle: "2.7 e, ln, log",
    body: `# e, natural log, and log

Three of the most-used symbols in all of science.

- $e \\approx 2.71828\\dots$ — **Euler's number**, the natural base. Defined by $\\lim_{n \\to \\infty}(1 + 1/n)^n$, and uniquely characterized by $\\dfrac{\\mathrm{d}}{\\mathrm{d}x} e^x = e^x$.
- $\\ln x$ — the **natural logarithm**, $\\log$ base $e$. By definition $\\ln(e^x) = x$.
- $\\log x$ — context-dependent! In math: usually $\\log_{10}$. In computer science: $\\log_2$. In statistics and most of physics: $\\ln$. Read carefully.

Key identities:

$$\\ln(ab) = \\ln a + \\ln b, \\qquad e^{\\ln x} = x, \\qquad \\log_b x = \\frac{\\ln x}{\\ln b}.$$

## A science example

**Radioactive decay** follows

$$N(t) = N_0\\, e^{-\\lambda t}.$$

Solving for the half-life ($N = N_0/2$) requires the natural log:

$$t_{1/2} = \\frac{\\ln 2}{\\lambda}.$$

Carbon-14 dating ($t_{1/2} \\approx 5{,}730$ years) inverts this equation every time an archaeologist puts a sample in the spectrometer. Without $e$ and $\\ln$, you cannot even write down the model, let alone solve it.`,
  },

  // ───────────────────────────────────────────────────────────────
  // Week 3 — Probability and statistics notation
  // ───────────────────────────────────────────────────────────────
  {
    slug: "greek-parameters",
    title: "Greek parameters: μ, σ, σ²",
    weekNumber: 3,
    blurb: "Population mean, standard deviation, and variance.",
    lectureTitle: "3.1 μ, σ, σ² — population parameters",
    body: `# Greek letters for population parameters

Statistics reserves **Greek letters for unknown population parameters** and Roman letters for the sample quantities used to estimate them.

- $\\mu$ — **mu**, the population mean (expected value).
- $\\sigma$ — **sigma**, the population standard deviation.
- $\\sigma^2$ — the population variance.

By convention:

$$\\mu = E[X], \\qquad \\sigma^2 = E[(X - \\mu)^2], \\qquad \\sigma = \\sqrt{\\sigma^2}.$$

Variance is in squared units; standard deviation has the same units as the data, which is why it is more often reported.

## A science example

In **quality control**, a manufacturing process produces parts whose diameters are modeled as drawn from a population with mean $\\mu = 10.00$ mm and standard deviation $\\sigma = 0.05$ mm. A "six-sigma" process keeps the spec limits at least $6\\sigma$ from $\\mu$ — here, $\\pm 0.30$ mm. The Greek letters are not just symbols; the entire industrial vocabulary ("six sigma") is built on naming $\\sigma$.

## Common confusion

$\\sigma$ is also the symbol for surface charge density (physics), electrical conductivity (engineering), and the Stefan–Boltzmann constant (thermodynamics). Context decides; the keyboard key is the same.`,
  },
  {
    slug: "sample-stats-hats",
    title: "Sample statistics: x̄, p̂, s",
    weekNumber: 3,
    blurb: "Bars for averages, hats for estimators.",
    lectureTitle: "3.2 x̄, p̂, s — sample statistics",
    body: `# Sample statistics: bars and hats

The diacritics on these letters carry as much meaning as the letters themselves.

- $\\bar x$ — read "**x-bar**." The **sample mean**: $\\bar x = \\tfrac{1}{n}\\sum x_i$. Estimates $\\mu$.
- $\\hat p$ — read "**p-hat**." A **sample proportion** or, more generally, an **estimator** of an unknown parameter.
- $s$ — the **sample standard deviation**. Estimates $\\sigma$. (And $s^2$ is the sample variance.)

The general rule:

> **Bars** denote averages of a sample. **Hats** denote estimators (educated guesses) of an unknown parameter.

## A science example

In a **clinical trial**, the true effectiveness $p$ of a vaccine in the entire population is unknown — it cannot be measured directly. We can only run the trial on a sample of $n$ volunteers, count the number protected, and report

$$\\hat p = \\frac{\\text{number protected}}{n}.$$

A vaccine reported as "95% effective" is really reporting $\\hat p = 0.95$ for some particular trial. The true $p$ is what we want; $\\hat p$ is the best guess we have. Confidence intervals (next week's territory) quantify how close they are likely to be.`,
  },
  {
    slug: "probability-notation",
    title: "Probability: P(A), P(A|B)",
    weekNumber: 3,
    blurb: "Probabilities and conditional probabilities.",
    lectureTitle: "3.3 P(A) and P(A|B)",
    body: `# Probability notation

- $P(A)$ — the **probability** of event $A$. A number in $[0, 1]$.
- $P(A \\cap B)$ — probability that **both** $A$ and $B$ happen.
- $P(A \\cup B)$ — probability that **either** happens (or both).
- $P(A \\mid B)$ — read "the probability of $A$ **given** $B$." The vertical bar means "conditional on."

The conditional is defined by

$$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}, \\qquad P(B) > 0,$$

and is the engine behind **Bayes' theorem**:

$$P(A \\mid B) = \\frac{P(B \\mid A)\\, P(A)}{P(B)}.$$

## A science example

In **epidemiology**, the **positive predictive value** of a test is exactly a conditional probability:

$$P(\\text{disease} \\mid \\text{positive test}).$$

This is *not* the same as the test's **sensitivity**, which is $P(\\text{positive test} \\mid \\text{disease})$ — and confusing the two is the single most common error in interpreting medical results. The vertical bar is doing decisive work here: swap what's left and right of it, and you have answered a completely different question.`,
  },
  {
    slug: "expectation-variance",
    title: "Expectation and variance: E(X), Var(X)",
    weekNumber: 3,
    blurb: "Operators that take a random variable and return a number.",
    lectureTitle: "3.4 E(X) and Var(X)",
    body: `# Expectation and variance

$X$ (capital, italic) denotes a **random variable**. Two operators act on it:

- $E[X]$ — the **expected value**, or long-run average, of $X$. Also written $\\mathbb{E}[X]$ or $\\mu_X$.
- $\\mathrm{Var}(X)$ — the **variance**, equal to $E[(X - E[X])^2]$. Also written $\\sigma_X^2$.

Both are *numbers*, not random variables. Useful rules (for constants $a, b$):

$$E[aX + b] = aE[X] + b, \\qquad \\mathrm{Var}(aX + b) = a^2 \\mathrm{Var}(X).$$

Notice variance is unaffected by the shift $b$ — it measures spread, not location — and squares the scaling $a$.

## A science example

In **quantum mechanics**, every observable corresponds to an operator, and the *expected* outcome of a measurement on a state $\\psi$ is written

$$\\langle X \\rangle_\\psi = E[X].$$

The bra-ket $\\langle \\cdot \\rangle$ is just the physicist's spelling of $E[\\cdot]$. The **uncertainty** $\\Delta X$ from Heisenberg's principle is the standard deviation $\\sqrt{\\mathrm{Var}(X)}$. The Greek $\\Delta$ and the statistical $\\sigma$ are, in this context, the same quantity dressed in two notations.`,
  },
  {
    slug: "distribution-notation",
    title: "Distributions: N(μ,σ²), ~",
    weekNumber: 3,
    blurb: "Saying 'X is distributed as ...' in symbols.",
    lectureTitle: "3.5 X ~ N(μ, σ²)",
    body: `# Distribution notation

The squiggle $\\sim$ in statistics is read "**is distributed as**." It connects a random variable to its distribution.

$$X \\sim N(\\mu, \\sigma^2)$$

means "$X$ is a normal random variable with mean $\\mu$ and variance $\\sigma^2$."

Other common families:

- $X \\sim \\text{Bernoulli}(p)$ — coin flip with success probability $p$.
- $X \\sim \\text{Binomial}(n, p)$ — number of successes in $n$ flips.
- $X \\sim \\text{Poisson}(\\lambda)$ — rare-event counts with rate $\\lambda$.
- $X \\sim \\text{Exp}(\\lambda)$ — waiting time between Poisson events.

The parameters in parentheses uniquely determine the distribution.

## A science example

**Measurement error** in a well-calibrated instrument is typically modeled as

$$\\varepsilon \\sim N(0, \\sigma^2),$$

with mean zero (no bias) and variance $\\sigma^2$ (the instrument's precision). When a physicist reports $g = 9.812 \\pm 0.003 \\ \\text{m/s}^2$, the implicit model is $\\text{measured } g = \\text{true } g + \\varepsilon$ with $\\varepsilon \\sim N(0, 0.003^2)$. The $\\sim$ does a lot of compact work: distribution family, location, spread — all in five characters.`,
  },
  {
    slug: "test-statistics",
    title: "Test statistics: z, t, χ²",
    weekNumber: 3,
    blurb: "The standardized scores that drive hypothesis tests.",
    lectureTitle: "3.6 z, t, χ² — test statistics",
    body: `# Test statistics

Hypothesis testing standardizes a sample result into a single number whose distribution under the null hypothesis is known.

- $z$ — the **z-score**, $z = \\dfrac{\\bar x - \\mu_0}{\\sigma/\\sqrt{n}}$. Used when $\\sigma$ is known. Under the null, $z \\sim N(0, 1)$.
- $t$ — **Student's t-statistic**, $t = \\dfrac{\\bar x - \\mu_0}{s/\\sqrt n}$. Used when $\\sigma$ is estimated by $s$. Heavier tails than $z$ for small $n$.
- $\\chi^2$ — **chi-squared statistic**, used for goodness-of-fit and independence tests. The Greek letter is "chi," pronounced "kai."

Each comes with its own table (or computer routine) that turns the statistic into a **p-value**.

## A science example

A **chi-squared goodness-of-fit test** is how geneticists check whether observed offspring ratios match a Mendelian prediction. Mendel's classic 9:3:3:1 ratio for two traits would predict, in 160 offspring, counts of 90:30:30:10. The actual experiment might yield 88:31:32:9. The statistic

$$\\chi^2 = \\sum \\frac{(\\text{observed} - \\text{expected})^2}{\\text{expected}}$$

quantifies the disagreement, and the $\\chi^2$ distribution turns it into a probability. The Greek letter is, in effect, the verdict.`,
  },
  {
    slug: "alpha-beta-stats",
    title: "Significance and power: α, β",
    weekNumber: 3,
    blurb: "The two error rates of a hypothesis test.",
    lectureTitle: "3.7 α, β — the two error rates",
    body: `# α and β: the two error rates

Every hypothesis test has two ways to be wrong, each named with a Greek letter.

- $\\alpha$ — **alpha**, the **significance level** or Type I error rate. Probability of rejecting the null hypothesis when it is true. Conventionally $\\alpha = 0.05$.
- $\\beta$ — **beta**, the Type II error rate. Probability of *failing* to reject the null when it is false.
- $1 - \\beta$ — the **power** of the test.

By choice, $\\alpha$ is fixed before looking at the data. $\\beta$ depends on the true effect size, the sample size, and the variability — and you only get to make it small by collecting enough data.

## A science example

A **drug trial** with $\\alpha = 0.05$ accepts a 5% risk of "discovering" that an inert pill works. If $\\beta = 0.20$, the trial has only $1 - \\beta = 80\\%$ power to detect a real effect of the assumed size. Underpowered trials are *the* reason so much biomedical research fails to replicate.

In other branches of science:
- $\\alpha$ also denotes the fine-structure constant ($\\approx 1/137$) and angular acceleration.
- $\\beta$ denotes velocity as a fraction of $c$ in relativity, or a regression coefficient.

Same keys; different meanings. The reader decides from context.`,
  },

  // ───────────────────────────────────────────────────────────────
  // Week 4 — Logic, sets, and the foundations
  // ───────────────────────────────────────────────────────────────
  {
    slug: "set-membership",
    title: "Set membership: ∈, ∉",
    weekNumber: 4,
    blurb: "Is this thing in that set?",
    lectureTitle: "4.1 ∈ and ∉",
    body: `# Set membership

$\\in$ is the most-used symbol in all of higher mathematics. It means "**is an element of**."

- $x \\in A$ — $x$ is in the set $A$.
- $x \\notin A$ — $x$ is **not** in the set $A$.

Examples: $3 \\in \\{1, 2, 3\\}$, $\\pi \\notin \\mathbb{Z}$, $0.5 \\in [0, 1]$.

The symbol is a stylized lowercase Greek $\\varepsilon$ (epsilon, for "element"), introduced by Peano in 1889.

## A science example

In **machine learning**, a classification problem is stated by saying the label $y$ belongs to a finite set of classes:

$$y \\in \\{\\text{cat, dog, bird}\\}.$$

In particle physics, a particle's quantum state lives in a Hilbert space $\\mathcal{H}$:

$$|\\psi\\rangle \\in \\mathcal{H}.$$

Both sentences read "the thing on the left lives in the world on the right." That world might be finite or infinite-dimensional, but $\\in$ doesn't care — it asserts membership, full stop.`,
  },
  {
    slug: "subset-superset",
    title: "Subsets: ⊂, ⊆, ⊄",
    weekNumber: 4,
    blurb: "When one set sits inside another.",
    lectureTitle: "4.2 ⊂, ⊆, ⊄",
    body: `# Subsets

- $A \\subseteq B$ — $A$ is a **subset** of $B$: every element of $A$ is also in $B$. Equality $A = B$ is *allowed*.
- $A \\subset B$ — depending on author, either the same as $\\subseteq$ or the strictly **proper** subset (i.e., $A \\subseteq B$ and $A \\neq B$). When in doubt, write $\\subsetneq$ for "proper" or $\\subseteq$ for "possibly equal."
- $A \\not\\subset B$ — there exists at least one element of $A$ that is not in $B$.

Don't confuse $\\in$ (single element of) with $\\subseteq$ (whole set inside another). $\\{1\\} \\subseteq \\{1, 2\\}$ but $\\{1\\} \\notin \\{1, 2\\}$.

## A science example

In biology, taxonomic ranks are nested subsets:

$$\\text{species} \\subsetneq \\text{genus} \\subsetneq \\text{family} \\subsetneq \\text{order}.$$

Every species belongs to exactly one genus, every genus to exactly one family, and the $\\subsetneq$ at each level reminds you the larger rank strictly contains more.

In linear algebra, the column space of a matrix $A$ is a subspace of the whole space: $\\text{Col}(A) \\subseteq \\mathbb{R}^m$. Whether the inclusion is proper tells you whether $A$ is surjective.`,
  },
  {
    slug: "set-operations",
    title: "Set operations: ∪, ∩, ∅, Aᶜ",
    weekNumber: 4,
    blurb: "Building new sets from old ones.",
    lectureTitle: "4.3 ∪, ∩, ∅, Aᶜ",
    body: `# Set operations

Four symbols, four ways to combine or modify a set.

- $A \\cup B$ — **union**, "$A$ or $B$" (inclusive). $\\{1,2\\} \\cup \\{2,3\\} = \\{1,2,3\\}$.
- $A \\cap B$ — **intersection**, "$A$ and $B$." $\\{1,2\\} \\cap \\{2,3\\} = \\{2\\}$.
- $\\emptyset$ (or $\\{\\}$) — the **empty set**, with no elements.
- $A^c$ — the **complement** of $A$, everything in the universe *not* in $A$. Sometimes written $\\bar A$.

Two sets are **disjoint** when $A \\cap B = \\emptyset$. **De Morgan's laws** are notational gems:

$$(A \\cup B)^c = A^c \\cap B^c, \\qquad (A \\cap B)^c = A^c \\cup B^c.$$

## A science example

In **probability**, set notation *is* event notation. For independent events $A$ and $B$:

$$P(A \\cap B) = P(A) \\cdot P(B), \\qquad P(A \\cup B) = P(A) + P(B) - P(A \\cap B).$$

A genetic risk study asking "what fraction of patients have *both* mutation X *and* environmental exposure Y?" is computing $P(X \\cap Y)$. "*Either*" is $P(X \\cup Y)$. The wrong symbol gives the wrong answer — and, in a clinical setting, the wrong recommendation.`,
  },
  {
    slug: "quantifiers",
    title: "Quantifiers: ∀, ∃, ∄",
    weekNumber: 4,
    blurb: "'For all', 'there exists', 'there does not exist'.",
    lectureTitle: "4.4 ∀, ∃, ∄",
    body: `# Quantifiers

These symbols turn a *property* into a *claim about a whole set*.

- $\\forall$ — **for all** (an upside-down A, for "All").
- $\\exists$ — **there exists** (a backward E, for "Exists").
- $\\exists !$ — there exists a **unique**.
- $\\nexists$ — there does **not** exist.

Read $\\forall x \\in \\mathbb{R},\\ x^2 \\ge 0$ as: "for every real $x$, $x^2$ is non-negative." Read $\\exists x \\in \\mathbb{Z}\\ \\text{such that}\\ x^2 = 4$ as: "there is at least one integer whose square is 4."

**Order matters.** $\\forall x \\exists y$ (for each $x$ a possibly different $y$) is a completely different statement from $\\exists y \\forall x$ (one $y$ that works for every $x$).

## A science example

The **definition of a limit** uses both quantifiers and is the gateway statement of analysis:

$$\\lim_{x \\to a} f(x) = L \\iff \\forall \\varepsilon > 0,\\ \\exists \\delta > 0 : |x - a| < \\delta \\Rightarrow |f(x) - L| < \\varepsilon.$$

Reading aloud: "for every error tolerance $\\varepsilon$ you demand, there exists a closeness $\\delta$ that guarantees it." Swap the quantifiers and you get a stronger, false claim. The two upside-down letters are doing more conceptual work here than the entire English language could do in a paragraph.`,
  },
  {
    slug: "logical-connectives",
    title: "Logical connectives: ∧, ∨, ¬",
    weekNumber: 4,
    blurb: "AND, OR, NOT — the three building blocks of logic.",
    lectureTitle: "4.5 ∧, ∨, ¬",
    body: `# Logical connectives

Three symbols build every truth-functional sentence.

- $\\wedge$ — **AND** (conjunction). $P \\wedge Q$ is true only when both $P$ and $Q$ are true.
- $\\vee$ — **OR** (inclusive disjunction). $P \\vee Q$ is true when at least one is.
- $\\neg$ — **NOT** (negation). $\\neg P$ is true exactly when $P$ is false.

Visually, $\\wedge$ looks like an "A" (for "And"); $\\vee$ is its mirror image.

**De Morgan's laws** in logic (same shape as for sets):

$$\\neg(P \\wedge Q) \\equiv \\neg P \\vee \\neg Q, \\qquad \\neg(P \\vee Q) \\equiv \\neg P \\wedge \\neg Q.$$

## A science example

**Digital electronics** is literal propositional logic baked into silicon: an AND gate computes $\\wedge$, an OR gate computes $\\vee$, an inverter computes $\\neg$. Any circuit you can describe with these three can be built from NAND gates alone, because $P \\wedge Q$, $P \\vee Q$, and $\\neg P$ are all expressible in NAND. The whole edifice of computing rests on these three symbols and the truth tables behind them.

In databases, the SQL clause "WHERE age >= 18 AND country = 'US'" is the SQL spelling of $(\\text{age} \\ge 18) \\wedge (\\text{country} = \\text{US})$.`,
  },
  {
    slug: "implication",
    title: "Implication: →, ↔",
    weekNumber: 4,
    blurb: "If-then and if-and-only-if.",
    lectureTitle: "4.6 → and ↔",
    body: `# Implication

- $P \\to Q$ — **implication**, read "if $P$ then $Q$" or "$P$ implies $Q$." Equivalent to $\\neg P \\vee Q$.
- $P \\leftrightarrow Q$ — **biconditional**, read "$P$ if and only if $Q$" (often abbreviated **iff**). True when $P$ and $Q$ have the same truth value.
- $P \\Rightarrow Q$ — usually identical to $\\to$, sometimes reserved for "$P$ logically entails $Q$."

The truth table of $P \\to Q$ has one surprising row: when $P$ is **false**, $P \\to Q$ is **true** regardless of $Q$ (a vacuous truth). "If the moon is made of cheese, then $2 + 2 = 5$" is, formally, a true sentence.

## Two notorious fallacies

- **Affirming the consequent**: from $P \\to Q$ and $Q$, you cannot conclude $P$.
- **Denying the antecedent**: from $P \\to Q$ and $\\neg P$, you cannot conclude $\\neg Q$.

The only valid moves are **modus ponens** ($P \\to Q$, $P$, therefore $Q$) and **modus tollens** ($P \\to Q$, $\\neg Q$, therefore $\\neg P$).

## A science example

A **scientific hypothesis** is a conditional: "$H \\to D$" — if hypothesis $H$ is true, we should observe data $D$. Observing $D$ does **not** prove $H$ (affirming the consequent); but observing $\\neg D$ refutes $H$ by modus tollens. This is exactly the **asymmetry** that Popper called *falsifiability*. The whole philosophy of science can be read off the truth table of $\\to$.`,
  },
  {
    slug: "number-sets",
    title: "Number sets: ℕ, ℤ, ℚ, ℝ, ℂ",
    weekNumber: 4,
    blurb: "The five most-named sets in mathematics.",
    lectureTitle: "4.7 ℕ, ℤ, ℚ, ℝ, ℂ",
    body: `# The blackboard-bold number sets

These five double-struck letters name the most-used number systems.

- $\\mathbb{N}$ — **natural numbers**: $\\{1, 2, 3, \\dots\\}$ (or $\\{0, 1, 2, \\dots\\}$, depending on convention).
- $\\mathbb{Z}$ — **integers**: $\\{\\dots, -2, -1, 0, 1, 2, \\dots\\}$. From German *Zahlen* ("numbers").
- $\\mathbb{Q}$ — **rationals**: ratios $p/q$ with $p, q \\in \\mathbb{Z}$, $q \\neq 0$. From *Quotient*.
- $\\mathbb{R}$ — **real numbers**: every point on the number line.
- $\\mathbb{C}$ — **complex numbers**: $a + bi$ with $a, b \\in \\mathbb{R}$ and $i^2 = -1$.

They nest:

$$\\mathbb{N} \\subsetneq \\mathbb{Z} \\subsetneq \\mathbb{Q} \\subsetneq \\mathbb{R} \\subsetneq \\mathbb{C}.$$

Each enlargement was historically driven by an equation the previous system couldn't solve: $x + 1 = 0$ (need $\\mathbb{Z}$), $2x = 1$ (need $\\mathbb{Q}$), $x^2 = 2$ (need $\\mathbb{R}$), $x^2 = -1$ (need $\\mathbb{C}$).

## A science example

A **quantum wavefunction** maps spacetime to the complex numbers:

$$\\psi: \\mathbb{R}^4 \\to \\mathbb{C}.$$

The reals model space and time; the codomain $\\mathbb{C}$ is where the wavefunction's amplitude and phase both live. Squaring the modulus, $|\\psi|^2 \\in \\mathbb{R}_{\\ge 0}$, recovers a probability density on $\\mathbb{R}^3$. Quantum mechanics is essentially a sentence whose subject is in $\\mathbb{C}$ and whose verb projects back to $\\mathbb{R}$.`,
  },
];

type SeedAssignment = {
  kind: "homework" | "test" | "midterm" | "final";
  title: string;
  weekNumber: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  instructions: string;
  problems: Array<{
    topicSlug: string;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  // ───────────── Week 1 ─────────────
  {
    kind: "homework",
    title: "Homework 1.1 — Equality, inequality, ±, ∝",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Use the math keyboard to type the requested symbols. Each answer should be written in proper mathematical notation, not English.",
    problems: [
      {
        topicSlug: "equality-family",
        prompt:
          "Using the correct symbol from {=, ≠, ≈, ≡}, write a true statement comparing π and 22/7. Then write a second statement comparing the values $2 + 2$ and $4$ using the correct symbol.",
        correctAnswer: "π ≈ 22/7 and 2 + 2 = 4",
        explanation:
          "$\\pi$ and $22/7$ are not exactly equal but are close, so $\\pi \\approx 22/7$. The two sides of $2 + 2$ and $4$ name the same value, so $=$ is correct.",
      },
      {
        topicSlug: "inequalities-notation",
        prompt:
          "Write a single inequality (using <, >, ≤, or ≥) expressing the condition that a temperature T in Celsius is at or below freezing.",
        correctAnswer: "T ≤ 0",
        explanation: "At-or-below freezing means $T \\le 0\\,°\\text{C}$. The non-strict $\\le$ includes the exact freezing point.",
      },
      {
        topicSlug: "plus-minus-proportional",
        prompt:
          "Using ± and √, write both solutions of $x^2 = 49$ in a single expression.",
        correctAnswer: "x = ±√49 = ±7",
        explanation: "$x^2 = 49 \\Rightarrow x = \\pm\\sqrt{49} = \\pm 7$. The $\\pm$ captures both roots.",
      },
      {
        topicSlug: "plus-minus-proportional",
        prompt:
          "Using the ∝ symbol, write the statement: 'The area A of a circle is proportional to the square of its radius r.'",
        correctAnswer: "A ∝ r²",
        explanation:
          "$A \\propto r^2$. The constant of proportionality is $\\pi$ (so $A = \\pi r^2$), but $\\propto$ states only the shape of the relationship.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 1.2 — Powers, roots, |x|, subscripts",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Use the math keyboard for every symbol.",
    problems: [
      {
        topicSlug: "exponents-notation",
        prompt:
          "Using exponent notation, write the formula for kinetic energy of a mass m moving at speed v.",
        correctAnswer: "KE = (1/2) m v²",
        explanation:
          "$\\text{KE} = \\tfrac{1}{2} m v^2$. The exponent on $v$ is what makes a doubling of speed quadruple the energy.",
      },
      {
        topicSlug: "roots-notation",
        prompt:
          "Using √, write the formula for the period T of a pendulum of length L (assume g is the gravitational acceleration).",
        correctAnswer: "T = 2π √(L/g)",
        explanation: "$T = 2\\pi \\sqrt{L/g}$.",
      },
      {
        topicSlug: "abs-factorial-notation",
        prompt:
          "Using |·|, write the statement that x is within 2 units of 5 (i.e., the distance from x to 5 is at most 2). Then, using factorial notation, write the number of ways to order 6 distinct books on a shelf.",
        correctAnswer: "|x − 5| ≤ 2 and 6! = 720",
        explanation:
          "Distance from $x$ to $5$ is $|x - 5|$, so $|x-5| \\le 2$. Orderings of 6 distinct items: $6! = 720$.",
      },
      {
        topicSlug: "subscripts-indexing",
        prompt:
          "Using subscripts, write the kinematic formula for the final velocity of an object with initial velocity v₀ under constant acceleration a after time t.",
        correctAnswer: "v_f = v_0 + a t",
        explanation:
          "$v_f = v_0 + a t$. The subscripts distinguish the initial ($v_0$) and final ($v_f$) velocities.",
      },
    ],
  },
  {
    kind: "test",
    title: "Week 1 Test — Foundational notation",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 30,
    instructions:
      "Timed. 30 minutes. Math keyboard available; pasting is disabled. Every answer must use the relevant symbol explicitly.",
    problems: [
      {
        topicSlug: "equality-family",
        prompt:
          "Using one of {=, ≠, ≈, ≡}, write a true statement of the form '$\\sin^2\\theta + \\cos^2\\theta \\,?\\, 1$'. Pick the symbol that says 'true for every θ.'",
        correctAnswer: "sin²θ + cos²θ ≡ 1",
        explanation: "$\\sin^2\\theta + \\cos^2\\theta \\equiv 1$ — a Pythagorean identity, true for all $\\theta$.",
      },
      {
        topicSlug: "inequalities-notation",
        prompt:
          "State the second law of thermodynamics for an isolated system using ΔS and the correct inequality symbol.",
        correctAnswer: "ΔS ≥ 0",
        explanation: "$\\Delta S \\ge 0$, with equality for reversible processes only.",
      },
      {
        topicSlug: "exponents-notation",
        prompt:
          "Using exponent notation, write the surface area S of a sphere of radius r.",
        correctAnswer: "S = 4π r²",
        explanation: "$S = 4\\pi r^2$.",
      },
      {
        topicSlug: "roots-notation",
        prompt:
          "Using √, write the Pythagorean expression for the hypotenuse c of a right triangle with legs a and b.",
        correctAnswer: "c = √(a² + b²)",
        explanation: "$c = \\sqrt{a^2 + b^2}$.",
      },
      {
        topicSlug: "subscripts-indexing",
        prompt:
          "Using subscripts to denote time steps, write the difference equation that expresses 'this year's GDP equals last year's GDP plus growth G.'",
        correctAnswer: "Y_t = Y_{t-1} + G",
        explanation: "$Y_t = Y_{t-1} + G$. Subscripts distinguish the time periods.",
      },
    ],
  },

  // ───────────── Week 2 ─────────────
  {
    kind: "homework",
    title: "Homework 2.1 — Σ, Π, Δ",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Use Σ and Π keys from the math keyboard.",
    problems: [
      {
        topicSlug: "sigma-summation",
        prompt:
          "Using Σ, write the formula for the sample mean x̄ of n data points x₁, …, xₙ.",
        correctAnswer: "x̄ = (1/n) Σ_{i=1}^{n} x_i",
        explanation: "$\\bar x = \\tfrac{1}{n} \\sum_{i=1}^{n} x_i$.",
      },
      {
        topicSlug: "pi-product",
        prompt:
          "Using Π, write the definition of n! as a product over an index.",
        correctAnswer: "n! = Π_{k=1}^{n} k",
        explanation: "$n! = \\prod_{k=1}^{n} k$.",
      },
      {
        topicSlug: "delta-change",
        prompt:
          "Using Δ, write the formula for average velocity over an interval [t₁, t₂] given positions x₁ and x₂ at those times.",
        correctAnswer: "v̄ = Δx / Δt = (x₂ − x₁)/(t₂ − t₁)",
        explanation: "$\\bar v = \\tfrac{\\Delta x}{\\Delta t} = \\tfrac{x_2 - x_1}{t_2 - t_1}$.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2.2 — lim, →, ∞, d/dx, ∂, ∫, e, ln",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Use the Calculus tab of the math keyboard.",
    problems: [
      {
        topicSlug: "limits-infinity",
        prompt:
          "Using lim, →, and ∞, write the statement that 1/x approaches 0 as x grows without bound.",
        correctAnswer: "lim_{x → ∞} 1/x = 0",
        explanation: "$\\lim_{x \\to \\infty} \\tfrac{1}{x} = 0$.",
      },
      {
        topicSlug: "derivative-notation",
        prompt:
          "Using ∂, write the heat equation for temperature T(x, t) with diffusivity α (one-dimensional case).",
        correctAnswer: "∂T/∂t = α ∂²T/∂x²",
        explanation: "$\\partial T/\\partial t = \\alpha\\, \\partial^2 T/\\partial x^2$.",
      },
      {
        topicSlug: "integral-notation",
        prompt:
          "Using ∫, write the definite integral that gives the area under f(x) from a to b. Include the dx.",
        correctAnswer: "∫_a^b f(x) dx",
        explanation: "$\\int_a^b f(x)\\,\\mathrm{d}x$. The $\\mathrm{d}x$ is required.",
      },
      {
        topicSlug: "e-ln-log",
        prompt:
          "Using e and ln, write (a) the formula for radioactive decay starting from N₀ with decay constant λ, and (b) the resulting expression for the half-life t_{1/2}.",
        correctAnswer: "N(t) = N₀ e^{−λt}, t_{1/2} = ln(2)/λ",
        explanation:
          "$N(t) = N_0 e^{-\\lambda t}$. Setting $N = N_0/2$ gives $t_{1/2} = \\ln 2/\\lambda$.",
      },
    ],
  },
  {
    kind: "midterm",
    title: "Midterm — Weeks 1 & 2",
    weekNumber: 2,
    isTimed: true,
    timeLimitMinutes: 60,
    instructions:
      "Cumulative midterm covering basic notation and calculus symbols. 60 minutes. Math keyboard available; pasting disabled.",
    problems: [
      {
        topicSlug: "equality-family",
        prompt:
          "Write a true statement using ≈ that gives e to four decimal places.",
        correctAnswer: "e ≈ 2.7183",
        explanation: "$e \\approx 2.7183$. (Exact value is irrational.)",
      },
      {
        topicSlug: "inequalities-notation",
        prompt:
          "Write a single inequality saying 'the probability p is between 0 and 1, inclusive.'",
        correctAnswer: "0 ≤ p ≤ 1",
        explanation: "$0 \\le p \\le 1$. Both endpoints are allowed for a probability.",
      },
      {
        topicSlug: "exponents-notation",
        prompt:
          "Using exponent notation, write Einstein's rest-energy equation for a particle of mass m.",
        correctAnswer: "E = m c²",
        explanation: "$E = mc^2$.",
      },
      {
        topicSlug: "subscripts-indexing",
        prompt:
          "Using subscripts, write the second component of a 3-vector v in coordinate form. (Use v_x, v_y, v_z notation.)",
        correctAnswer: "v_y",
        explanation: "$v_y$ — the $y$-component of $\\vec v = (v_x, v_y, v_z)$.",
      },
      {
        topicSlug: "sigma-summation",
        prompt:
          "Using Σ, write the sum of the first 100 positive integers in compact form.",
        correctAnswer: "Σ_{i=1}^{100} i",
        explanation: "$\\sum_{i=1}^{100} i$. (Its value is $5050$.)",
      },
      {
        topicSlug: "delta-change",
        prompt:
          "Using Δ, write the chemistry expression for the enthalpy change of a reaction.",
        correctAnswer: "ΔH",
        explanation: "$\\Delta H$ — change in enthalpy.",
      },
      {
        topicSlug: "derivative-notation",
        prompt:
          "Using d/dx, write the derivative of x³ with respect to x as an equation.",
        correctAnswer: "d/dx (x³) = 3x²",
        explanation: "$\\dfrac{\\mathrm{d}}{\\mathrm{d}x}(x^3) = 3x^2$.",
      },
      {
        topicSlug: "e-ln-log",
        prompt:
          "Using ln, solve the equation e^x = 7 for x.",
        correctAnswer: "x = ln(7)",
        explanation: "$x = \\ln 7 \\approx 1.9459$.",
      },
    ],
  },

  // ───────────── Week 3 ─────────────
  {
    kind: "homework",
    title: "Homework 3.1 — μ, σ, x̄, p̂",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Use the Statistics tab of the math keyboard.",
    problems: [
      {
        topicSlug: "greek-parameters",
        prompt:
          "Using μ and σ, write the formula that says 'about 95% of values from a normal distribution lie within two standard deviations of the mean,' as an interval.",
        correctAnswer: "[μ − 2σ, μ + 2σ]",
        explanation: "$[\\mu - 2\\sigma,\\ \\mu + 2\\sigma]$ — the 95% interval under the empirical rule.",
      },
      {
        topicSlug: "sample-stats-hats",
        prompt:
          "A clinical trial of 200 patients records 190 successes. Using p̂, write the sample proportion and give its decimal value.",
        correctAnswer: "p̂ = 190/200 = 0.95",
        explanation: "$\\hat p = 190/200 = 0.95$.",
      },
      {
        topicSlug: "probability-notation",
        prompt:
          "Using P(·) and P(·|·), write the definition of conditional probability for P(A | B).",
        correctAnswer: "P(A | B) = P(A ∩ B) / P(B)",
        explanation: "$P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}$.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 3.2 — E(X), Var(X), N(μ,σ²), z, t, χ², α, β",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Use the Statistics tab freely.",
    problems: [
      {
        topicSlug: "expectation-variance",
        prompt:
          "Using E(·) and Var(·), write the linearity rule: for constants a and b, what are E(aX + b) and Var(aX + b)?",
        correctAnswer: "E(aX + b) = a E(X) + b; Var(aX + b) = a² Var(X)",
        explanation:
          "$E[aX + b] = aE[X] + b$; $\\mathrm{Var}(aX + b) = a^2 \\mathrm{Var}(X)$. The shift drops out of variance; the scaling squares.",
      },
      {
        topicSlug: "distribution-notation",
        prompt:
          "Using ~ and N(μ, σ²), write the statement that measurement error ε is normally distributed with mean 0 and variance 0.04.",
        correctAnswer: "ε ~ N(0, 0.04)",
        explanation: "$\\varepsilon \\sim N(0,\\, 0.04)$.",
      },
      {
        topicSlug: "test-statistics",
        prompt:
          "Using x̄, μ₀, σ, and n, write the formula for the z-statistic used to test H₀: μ = μ₀ when σ is known.",
        correctAnswer: "z = (x̄ − μ₀) / (σ / √n)",
        explanation: "$z = \\dfrac{\\bar x - \\mu_0}{\\sigma/\\sqrt n}$.",
      },
      {
        topicSlug: "alpha-beta-stats",
        prompt:
          "Using α and β, define (a) the Type I error rate and (b) the power of a hypothesis test.",
        correctAnswer: "α = P(reject H₀ | H₀ true); power = 1 − β",
        explanation:
          "$\\alpha$ is the Type I error rate, $\\beta$ is the Type II rate, and the power is $1 - \\beta$.",
      },
    ],
  },
  {
    kind: "test",
    title: "Week 3 Test — Statistics notation",
    weekNumber: 3,
    isTimed: true,
    timeLimitMinutes: 40,
    instructions: "Timed. 40 minutes. Math keyboard available; pasting disabled.",
    problems: [
      {
        topicSlug: "greek-parameters",
        prompt:
          "Using μ and σ, write the formula for the standardized z-score of a data value x drawn from a population.",
        correctAnswer: "z = (x − μ) / σ",
        explanation: "$z = \\dfrac{x - \\mu}{\\sigma}$.",
      },
      {
        topicSlug: "probability-notation",
        prompt:
          "Using P(·), P(·|·), and ∩, write Bayes' theorem.",
        correctAnswer: "P(A | B) = P(B | A) P(A) / P(B)",
        explanation: "$P(A \\mid B) = \\dfrac{P(B \\mid A) P(A)}{P(B)}$.",
      },
      {
        topicSlug: "expectation-variance",
        prompt:
          "Using E(·), write the definition of Var(X) (in terms of expectations).",
        correctAnswer: "Var(X) = E[(X − E(X))²]",
        explanation: "$\\mathrm{Var}(X) = E[(X - E[X])^2]$.",
      },
      {
        topicSlug: "distribution-notation",
        prompt:
          "Using ~, write a sentence in symbols asserting that a Bernoulli random variable Y has success probability p.",
        correctAnswer: "Y ~ Bernoulli(p)",
        explanation: "$Y \\sim \\text{Bernoulli}(p)$.",
      },
      {
        topicSlug: "test-statistics",
        prompt:
          "Using χ², write the goodness-of-fit statistic in terms of observed (O) and expected (E) cell counts.",
        correctAnswer: "χ² = Σ (O − E)² / E",
        explanation: "$\\chi^2 = \\sum \\dfrac{(O - E)^2}{E}$.",
      },
    ],
  },

  // ───────────── Week 4 ─────────────
  {
    kind: "homework",
    title: "Homework 4.1 — ∈, ⊆, ∪, ∩, ∅",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Use the Logic & Sets tab of the math keyboard.",
    problems: [
      {
        topicSlug: "set-membership",
        prompt:
          "Using ∈ and ∉, write two true statements: one about 3 and the set {1, 2, 3, 4}, and one about π and the set ℤ of integers.",
        correctAnswer: "3 ∈ {1,2,3,4} and π ∉ ℤ",
        explanation: "$3 \\in \\{1,2,3,4\\}$ (3 is in the set); $\\pi \\notin \\mathbb{Z}$ (π is irrational).",
      },
      {
        topicSlug: "subset-superset",
        prompt:
          "Using ⊆, write the nested chain of inclusions from the integers up through the complex numbers (use the standard blackboard-bold letters).",
        correctAnswer: "ℤ ⊆ ℚ ⊆ ℝ ⊆ ℂ",
        explanation: "$\\mathbb{Z} \\subseteq \\mathbb{Q} \\subseteq \\mathbb{R} \\subseteq \\mathbb{C}$.",
      },
      {
        topicSlug: "set-operations",
        prompt:
          "Using ∪, ∩, and either Aᶜ or A\\B notation, write De Morgan's law for the complement of a union.",
        correctAnswer: "(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ",
        explanation: "$(A \\cup B)^c = A^c \\cap B^c$.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 4.2 — ∀, ∃, ∧, ∨, ¬, →, ↔",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Use the Logic & Sets tab.",
    problems: [
      {
        topicSlug: "quantifiers",
        prompt:
          "Using ∀ and ∈, write the universal statement: 'For every real x, x² is at least 0.'",
        correctAnswer: "∀ x ∈ ℝ, x² ≥ 0",
        explanation: "$\\forall x \\in \\mathbb{R},\\ x^2 \\ge 0$.",
      },
      {
        topicSlug: "logical-connectives",
        prompt:
          "Using ∧, ∨, and ¬, write De Morgan's logical law for the negation of (P ∧ Q).",
        correctAnswer: "¬(P ∧ Q) ≡ ¬P ∨ ¬Q",
        explanation: "$\\neg(P \\wedge Q) \\equiv \\neg P \\vee \\neg Q$.",
      },
      {
        topicSlug: "implication",
        prompt:
          "Using →, write modus tollens as an inference: from P → Q and ¬Q, what can be concluded?",
        correctAnswer: "From (P → Q) and ¬Q, conclude ¬P",
        explanation: "Modus tollens: $(P \\to Q) \\wedge \\neg Q \\Rightarrow \\neg P$.",
      },
      {
        topicSlug: "number-sets",
        prompt:
          "Using ∈ and the blackboard-bold number sets, write a single sentence asserting that i (the imaginary unit) is in ℂ but not in ℝ.",
        correctAnswer: "i ∈ ℂ and i ∉ ℝ",
        explanation: "$i \\in \\mathbb{C}$ and $i \\notin \\mathbb{R}$, since $i^2 = -1$ has no real solution.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final Exam — All notation",
    weekNumber: 4,
    isTimed: true,
    timeLimitMinutes: 90,
    instructions:
      "Cumulative final covering every symbol family. 90 minutes. Math keyboard available; pasting disabled.",
    problems: [
      {
        topicSlug: "equality-family",
        prompt:
          "Pick the right symbol from {=, ≠, ≈, ≡} and write a true statement about $\\sin(\\pi)$ and $0$, and another about $1/3$ and $0.333$.",
        correctAnswer: "sin(π) = 0 and 1/3 ≈ 0.333",
        explanation: "$\\sin(\\pi) = 0$ exactly; $1/3 \\approx 0.333$ (the decimal is rounded).",
      },
      {
        topicSlug: "exponents-notation",
        prompt:
          "Using exponent notation, write Newton's law of gravitation with constant G, masses m₁ and m₂, and distance r.",
        correctAnswer: "F = G m₁ m₂ / r²",
        explanation: "$F = G\\dfrac{m_1 m_2}{r^2}$.",
      },
      {
        topicSlug: "sigma-summation",
        prompt:
          "Using Σ, write the formula for the dot product of two n-vectors a and b.",
        correctAnswer: "a · b = Σ_{i=1}^{n} a_i b_i",
        explanation: "$\\vec a \\cdot \\vec b = \\sum_{i=1}^{n} a_i b_i$.",
      },
      {
        topicSlug: "integral-notation",
        prompt:
          "Using ∫, write the integral form of work done by a force F(x) moving an object from x = a to x = b along the x-axis.",
        correctAnswer: "W = ∫_a^b F(x) dx",
        explanation: "$W = \\int_a^b F(x)\\,\\mathrm{d}x$.",
      },
      {
        topicSlug: "e-ln-log",
        prompt:
          "Using e, write the compound-interest formula in its continuous-compounding form for principal P, annual rate r, after t years.",
        correctAnswer: "A = P e^{rt}",
        explanation: "$A = P e^{rt}$.",
      },
      {
        topicSlug: "distribution-notation",
        prompt:
          "Using ~ and N(·,·), write that IQ scores X are normally distributed with mean 100 and standard deviation 15.",
        correctAnswer: "X ~ N(100, 15²)",
        explanation: "$X \\sim N(100,\\,15^2)$ — the second slot is the variance, $\\sigma^2 = 225$.",
      },
      {
        topicSlug: "probability-notation",
        prompt:
          "Using P(·|·), write the conditional probability that a randomly tested patient has a disease (D) given a positive test result (T).",
        correctAnswer: "P(D | T)",
        explanation:
          "$P(D \\mid T)$ — the positive predictive value of the test.",
      },
      {
        topicSlug: "quantifiers",
        prompt:
          "Using ∀, ∃, and >, write the ε–δ definition of $\\lim_{x \\to a} f(x) = L$.",
        correctAnswer:
          "∀ ε > 0, ∃ δ > 0 : |x − a| < δ ⇒ |f(x) − L| < ε",
        explanation:
          "$\\forall \\varepsilon > 0,\\ \\exists \\delta > 0$ such that $|x - a| < \\delta \\Rightarrow |f(x) - L| < \\varepsilon$.",
      },
      {
        topicSlug: "set-operations",
        prompt:
          "For independent events A and B with P(A)=0.4 and P(B)=0.5, write the equation for P(A ∩ B) using ∩, and compute the value.",
        correctAnswer: "P(A ∩ B) = P(A) · P(B) = 0.20",
        explanation: "Independence: $P(A \\cap B) = P(A) P(B) = 0.4 \\times 0.5 = 0.20$.",
      },
      {
        topicSlug: "number-sets",
        prompt:
          "Using ∈ and the blackboard-bold sets, classify each of $-7$, $2/3$, $\\sqrt{2}$, and $3 + 4i$ by writing four membership statements that place each number in its smallest standard set.",
        correctAnswer:
          "-7 ∈ ℤ, 2/3 ∈ ℚ, √2 ∈ ℝ, 3+4i ∈ ℂ",
        explanation:
          "$-7 \\in \\mathbb{Z}$ (integer), $2/3 \\in \\mathbb{Q}$ (rational, not integer), $\\sqrt 2 \\in \\mathbb{R}$ (irrational), $3 + 4i \\in \\mathbb{C}$ (non-real complex).",
      },
    ],
  },
];

// A stable fingerprint of the seed content. If the database holds topics that
// don't match this set, we wipe and re-seed instead of leaving stale content
// from a previous version of the course.
const EXPECTED_TOPIC_SLUGS = TOPICS.map((t) => t.slug).sort().join(",");

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.execute(sql`select count(*)::int as n from topics`);
  const row = (existing.rows[0] ?? {}) as { n?: number };
  const count = row.n ?? 0;

  if (count > 0) {
    const rows = await db.execute(sql`select slug from topics order by slug`);
    const actualSlugs = (rows.rows as Array<{ slug: string }>)
      .map((r) => r.slug)
      .sort()
      .join(",");
    if (actualSlugs === EXPECTED_TOPIC_SLUGS) {
      logger.info("Seed: already populated with current content, skipping");
      return;
    }
    logger.info(
      "Seed: topic slugs differ from expected course content — wiping and re-seeding",
    );
    // Order matters: child tables first.
    await db.execute(sql`delete from practice_attempts`);
    await db.execute(sql`delete from practice_problems`);
    await db.execute(sql`delete from practice_sessions`);
    await db.execute(sql`delete from answers`);
    await db.execute(sql`delete from attempts`);
    await db.execute(sql`delete from problems`);
    await db.execute(sql`delete from assignments`);
    await db.execute(sql`delete from lectures`);
    await db.execute(sql`delete from topics`);
  }

  logger.info("Seed: populating course content");

  // Topics + lectures
  const slugToTopicId = new Map<string, number>();
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i]!;
    const [inserted] = await db
      .insert(topicsTable)
      .values({
        slug: t.slug,
        title: t.title,
        weekNumber: t.weekNumber,
        blurb: t.blurb,
        position: i,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
    slugToTopicId.set(t.slug, inserted.id);
    await db.insert(lecturesTable).values({
      topicId: inserted.id,
      weekNumber: t.weekNumber,
      title: t.lectureTitle,
      body: t.body,
    });
  }

  // Assignments + problems
  for (let i = 0; i < ASSIGNMENTS.length; i++) {
    const a = ASSIGNMENTS[i]!;
    const [inserted] = await db
      .insert(assignmentsTable)
      .values({
        kind: a.kind,
        title: a.title,
        weekNumber: a.weekNumber,
        position: i,
        isTimed: a.isTimed,
        timeLimitMinutes: a.timeLimitMinutes,
        instructions: a.instructions,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert assignment ${a.title}`);
    for (let p = 0; p < a.problems.length; p++) {
      const prob = a.problems[p]!;
      const topicId = slugToTopicId.get(prob.topicSlug);
      if (!topicId) throw new Error(`Unknown topic slug ${prob.topicSlug}`);
      await db.insert(problemsTable).values({
        assignmentId: inserted.id,
        topicId,
        position: p,
        prompt: prob.prompt,
        correctAnswer: prob.correctAnswer,
        explanation: prob.explanation,
        hint: prob.hint ?? null,
      });
    }
  }

  logger.info({ topics: TOPICS.length, assignments: ASSIGNMENTS.length }, "Seed complete");
}
