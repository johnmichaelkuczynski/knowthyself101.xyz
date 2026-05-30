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
  // Week 1 — The Self You Inherited
  // ───────────────────────────────────────────────────────────────
  {
    slug: "self-concept",
    title: "Who you think you are",
    weekNumber: 1,
    blurb: "The picture you carry of yourself — and where it came from.",
    lectureTitle: "1.1 Who you think you are",
    body: `# Who you think you are

Before you can know yourself, you have to notice that you already have an answer — a working picture of who you are that you carry everywhere without examining it. *I'm the responsible one. I'm not creative. I'm easy-going. I'm the type who never finishes things.*

This picture is your **self-concept**, and most of it was assembled early, out of materials you didn't choose: a teacher's offhand remark, a sibling's role you were assigned, a single embarrassing afternoon you've never forgotten.

## Where it comes from

The psychologist William James split the self into the *I* (the part doing the experiencing) and the *me* (the part being described). Self-knowledge is mostly the slow work of turning the second one over in your hands. Much of the "me" is **inherited or absorbed**, not discovered — which means some of it is simply wrong, or expired, or true only because you keep acting as if it were.

## The work of this course

For the next four weeks you'll examine that picture one piece at a time. Not to demolish it — to *see* it clearly enough that you get a vote. The first step is the hardest: saying, in your own plain words, who you currently believe you are.

There are no right answers here. There is only the honest one and the convenient one — and you can usually feel the difference.`,
  },
  {
    slug: "earliest-memory",
    title: "Your earliest memories",
    weekNumber: 1,
    blurb: "Why the memories that survived are the ones that meant something.",
    lectureTitle: "1.2 Your earliest memories",
    body: `# Your earliest memories

You can remember almost nothing from before age three or four, and very little before seven. Out of thousands of days, a handful of scenes survived. The interesting question is not *what* you remember but *why these*.

## Memory as selection

We don't store the past like video. We keep fragments that carried emotional charge, and we quietly edit them to fit the story we're telling now. Alfred Adler, an early psychologist, used to ask patients for their **earliest memory** precisely because it isn't a neutral record — it's a kind of self-chosen emblem. A person who recalls being left at a gate remembers something different from one who recalls being lifted onto a shoulder.

## What survived, and what it taught

The memories that stuck usually encode an early lesson about how the world works: *people leave, effort gets noticed, attention is dangerous, I'm on my own.* You absorbed the lesson long before you had the words to argue with it.

You don't need a dramatic memory for this to matter. A small, vivid scene — light on a kitchen floor, the sound of a door — often says more than a big event, exactly because you can't explain why it stayed.

This week, look at one such fragment and ask what it taught you to expect.`,
  },
  {
    slug: "family-system",
    title: "The family you came from",
    weekNumber: 1,
    blurb: "You learned what 'normal' feels like before you could question it.",
    lectureTitle: "1.3 The family you came from",
    body: `# The family you came from

Your family was the first world you lived in, and like any first world it felt simply like *reality* rather than one arrangement among many. The volume people spoke at, how anger was handled, whether affection was spoken or implied, what got rewarded and what got silently punished — all of it set your baseline for "normal."

## Families as systems

Family therapists like Murray Bowen describe a family not as a set of individuals but as a **system**: a web of roles that balance each other. There's often a peacekeeper, a scapegoat, a star, a worrier, a clown. You were handed a role, and you may still be playing it in rooms your family will never enter — at work, in friendships, in love.

## Why it's invisible

The hardest patterns to see are the ones you mistook for the way things simply are. People raised where conflict was loud often find calm eerie; people raised where everything was unspoken often can't name what they feel even now.

You are not your family system, but you were shaped on its lathe. This week, name the role you played — and notice where you still play it.`,
  },
  {
    slug: "formative-wounds",
    title: "Formative wounds",
    weekNumber: 1,
    blurb: "The early hurts that quietly organised your defences.",
    lectureTitle: "1.4 Formative wounds",
    body: `# Formative wounds

Some of who you are is a scar — a sensible response to an old injury, kept long after the danger passed. A child who learned that needing things led to disappointment may have become impressively self-sufficient. A child who was praised only for achievement may have become a relentless achiever who can't rest.

## The logic of defences

The psychoanalytic tradition calls these **defences**: strategies that once protected you and now run on their own. The point is not to blame anyone. The point is that a defence is *intelligent* — it solved a real problem — but it tends to outlive its usefulness and start solving problems you no longer have.

## Finding the seam

You can often locate an old wound by its disproportion. When a small thing produces a large reaction — a tone of voice that floods you, a kind of criticism that you can't shake off for days — you've usually touched a seam. The size of the reaction belongs to the past, not the present.

This is tender material, so go gently. You don't have to relive anything. You only have to name, briefly and honestly, one early hurt and the protective habit it left behind.`,
  },
  {
    slug: "abandoned-selves",
    title: "The selves you set aside",
    weekNumber: 1,
    blurb: "What you wanted to be, and the moment that quietly changed.",
    lectureTitle: "1.5 The selves you set aside",
    body: `# The selves you set aside

At some point you wanted to be something — an astronaut, a novelist, a person who lived abroad, someone braver than you turned out to be. Most of those futures were set down somewhere along the way, often without a decision being made out loud.

## The roads not taken

Some were set aside for good reasons: you discovered you didn't actually want them. But others were abandoned out of fear, or because someone made them seem foolish, or because life narrowed and you stopped noticing the off-ramps. The philosopher Kierkegaard wrote about the quiet **despair** of a life that has never become what it sensed it could be — a despair so common it passes for normal.

## Why this matters now

An abandoned self doesn't always disappear. Sometimes it lingers as a faint ache, a thing you feel when you meet someone who took the road you didn't. That ache is information. It can point at a value you let go of, or at a fear that did your choosing for you.

This week, recover one of these set-aside selves. Name what you once wanted to be, and — as honestly as you can — when and why that changed.`,
  },
  {
    slug: "inherited-values",
    title: "The values you inherited",
    weekNumber: 1,
    blurb: "The rules you absorbed before you could consent to them.",
    lectureTitle: "1.6 The values you inherited",
    body: `# The values you inherited

You arrived at adulthood already holding strong opinions about what a good life looks like, what's shameful, what's admirable, what money is for, how hard you should work. You didn't reason your way to most of them. You absorbed them — from parents, religion, class, country, the era you grew up in.

## Absorbed vs. chosen

There's nothing wrong with inherited values; we'd be lost without a starting set. The trouble is that an unexamined value feels like an objective fact rather than a position you could hold differently. *Of course* success means a certain kind of job. *Of course* you don't talk about that. The word "of course" is often the sound of an inheritance you've never audited.

## Testing the inheritance

One useful test: ask where a strong conviction came from, and whether you'd still choose it from scratch today. Some you'll keep with new conviction. Others you'll find you've been carrying out of loyalty, or habit, or fear of what dropping them would mean.

This week, name one value you were handed — and say, honestly, whether it's still yours or just still with you.`,
  },
  {
    slug: "self-story",
    title: "The story you tell about yourself",
    weekNumber: 1,
    blurb: "How you narrate your own life — and what the narration hides.",
    lectureTitle: "1.7 The story you tell about yourself",
    body: `# The story you tell about yourself

When someone asks how your life has gone, you don't recite facts — you tell a *story*, with a shape: a rise, a fall, a comeback, a long wait, a series of near-misses. Psychologists who study **narrative identity** find that this story is one of the truest things about a person, because the shape you give your life reveals what you believe it means.

## The same facts, different stories

The same events can be told as "I overcame" or "I was failed," as "I was lucky" or "I earned it," as comedy or tragedy. Notice which mode comes naturally to you. People who tell **redemption** stories — bad turning to good — tend to be more generative and resilient; people stuck in **contamination** stories — good turning to bad — often feel that way about the future too.

## The narrator is not neutral

Your inner narrator has habits: who it casts as the hero, who gets blamed, what it leaves out. Those habits are choices, even when they don't feel like choices.

This week, tell your life as a short story — a few sentences with a shape — and then notice what kind of story you reached for, and who you left on the cutting-room floor.`,
  },

  // ───────────────────────────────────────────────────────────────
  // Week 2 — The Self You Enact
  // ───────────────────────────────────────────────────────────────
  {
    slug: "unwatched-self",
    title: "What you do unwatched",
    weekNumber: 2,
    blurb: "Character is what's left when no one is keeping score.",
    lectureTitle: "2.1 What you do unwatched",
    body: `# What you do unwatched

There's the self you perform for others and the self that runs when nobody's looking — late at night, alone in the car, on a free afternoon no one will ask about. The gap between them is one of the most honest measurements of character you can take.

## The ring of Gyges

In Plato's *Republic*, the character Glaucon imagines a ring that makes its wearer invisible, and asks: would anyone stay just if they could never be caught? The thought experiment cuts to the bone. The unwatched self isn't the "bad" self — it's the *undefended* one. What you reach for when there's nothing to prove and no one to impress tells you what you actually want, as opposed to what you want to be seen wanting.

## Reading the evidence

The clues are mundane: how you spend genuinely free time, what you do with a private windfall of an hour, whether your standards hold when they cost you nothing and no one would know. There's no judgment built into this — escapism and discipline can both be honest. The question is only what's *true*.

This week, look at your unwatched self plainly, and report what you find without dressing it up.`,
  },
  {
    slug: "avoidances",
    title: "What you avoid",
    weekNumber: 2,
    blurb: "The shape of your fears, read from what you won't approach.",
    lectureTitle: "2.2 What you avoid",
    body: `# What you avoid

You can map a person's fears without ever asking about fear — just watch what they steer around. The unopened mail, the conversation perpetually postponed, the medical appointment, the dream too risky to attempt, the feeling you stay too busy to feel. **Avoidance** is fear with the volume turned down low enough to ignore.

## The cost of the detour

Avoidance works in the short term, which is exactly why it's so durable. The relief of *not* doing the hard thing is immediate; the cost is deferred and diffuse. Over years, though, a life can quietly organise itself around its avoidances — a whole route planned to skip a single street.

## What the detour protects

Behind most avoidances is something you're protecting: a self-image ("I'm not the kind of person who fails at this"), a comfort, a relationship you fear testing. Naming what you avoid usually means naming what you're afraid to find out.

The aim here isn't to shame yourself into action. It's just to see clearly. This week, name one thing you've been avoiding, and — more revealingly — what you think you're protecting by avoiding it.`,
  },
  {
    slug: "energy-map",
    title: "What drains you, what restores you",
    weekNumber: 2,
    blurb: "Your energy is an honest compass; most people ignore it.",
    lectureTitle: "2.3 What drains you, what restores you",
    body: `# What drains you, what restores you

Forget for a moment what you *should* enjoy. Notice instead what actually leaves you lighter and what leaves you hollowed out. Your energy is one of the few signals that's very hard to fake to yourself — you can talk yourself into liking something, but you can't talk yourself out of being exhausted by it.

## Restoration isn't always rest

What restores you isn't always "relaxing." For some people a hard climb or a long conversation is restorative while a quiet evening is draining. The psychologist Mihály Csíkszentmihályi's work on **flow** found that people are often most alive during effortful, absorbing activity — and oddly flat during the leisure they thought they craved.

## Drains hide in plain sight

Some drains are obvious; others are smuggled in as things you "enjoy" — the social event you always agree to and always leave depleted, the scrolling that promises rest and delivers fog. Telling true restoration from mere numbing is a real skill, and a revealing one.

This week, name one thing that reliably restores you and one that reliably drains you — and be honest about anything you keep choosing that quietly belongs in the second column.`,
  },
  {
    slug: "work-and-effort",
    title: "Your relationship to work",
    weekNumber: 2,
    blurb: "What effort means to you, beneath the job itself.",
    lectureTitle: "2.4 Your relationship to work",
    body: `# Your relationship to work

Underneath the particular job you do is a deeper, older relationship to **effort** itself. For some, work is identity — to stop is to disappear. For others it's an exchange, hours for money, with the real life happening elsewhere. For others it's a proving ground, or a refuge from things harder than work.

## Where the relationship was formed

Much of this was set early. A child praised only for achievement learns that worth must be earned, repeatedly, forever. A child who watched a parent's life consumed by work may have sworn never to repeat it — or may repeat it exactly. The sociologist Max Weber traced how a whole culture turned diligence into a sign of virtue, even of salvation; you may be running a private version of that script.

## The tell

Watch what happens when you're *forced* to rest. Do you feel free, or guilty, or anxious, or strangely worthless? The discomfort is the relationship showing itself. So is the opposite — the pull to avoid effort even when the thing matters to you.

This week, say in plain terms what work really means to you — not what it's supposed to mean — and where you think that came from.`,
  },
  {
    slug: "money-and-security",
    title: "Money and security",
    weekNumber: 2,
    blurb: "Money is rarely about money; it's about what you fear and want.",
    lectureTitle: "2.5 Money and security",
    body: `# Money and security

Few subjects are as loaded and as poorly examined as money. We talk about it in numbers, but we *feel* it as safety, freedom, status, love, control, or fear. Your relationship to money is rarely about the money. It's about what you're afraid will happen without it, and what you imagine it would finally let you do or be.

## The scripts we run

Behaviourally, people run remarkably consistent **money scripts** — often formed by what they saw at home. Some hoard against a catastrophe that already happened to someone before them. Some spend to feel, briefly, like the lack is over. Some avoid looking at it entirely, because looking means feeling something they'd rather not. None of these are really financial strategies; they're emotional ones wearing a financial costume.

## What "enough" means

A revealing question is what *enough* would look like — and whether any number ever feels like enough, or whether the goalpost moves the moment you reach it. The answer usually points at the real hunger underneath.

This week, name what money actually represents to you — security, freedom, worth, escape, something else — and notice the feeling that comes up when you imagine having much less of it.`,
  },
  {
    slug: "risk-and-failure",
    title: "Risk, ambition, failure",
    weekNumber: 2,
    blurb: "Your appetite for risk reveals what you're really optimising for.",
    lectureTitle: "2.6 Risk, ambition, failure",
    body: `# Risk, ambition, failure

How much are you willing to risk, and for what? Some people will gamble comfort for a shot at something bigger; others will trade almost any upside for the certainty of not losing what they have. Neither is wrong — but which one you are says a great deal about what you're really optimising for.

## Loss looms larger than gain

Research on decision-making by Kahneman and Tversky found that, for most people, **losses hurt about twice as much as equivalent gains feel good**. We are built to protect what we hold. That instinct keeps us safe and also keeps us small; a life perfectly defended against loss is also defended against most of its possibilities.

## The relationship with failure

Ambition is inseparable from your relationship to **failure** — because to reach for more is to risk falling short in front of yourself and others. Some people treat failure as information; others as a verdict. The difference shapes how much they'll ever attempt.

This week, be honest about your appetite for risk, and about what failure means to you — a lesson, or a sentence. Name one risk you didn't take, and what stopped you.`,
  },
  {
    slug: "anger",
    title: "What you do with anger",
    weekNumber: 2,
    blurb: "Anger always points at something you value or fear.",
    lectureTitle: "2.7 What you do with anger",
    body: `# What you do with anger

Anger is one of the most informative emotions and one of the most mishandled. It tends to fire when a boundary is crossed, a value is violated, or something you care about is threatened. The feeling itself is a kind of signal — the trouble is what we do with it.

## The styles of anger

People develop characteristic styles. Some **explode** — fast, loud, over quickly. Some **suppress** — swallowing it until it leaks out sideways as sarcasm, withdrawal, or a body that aches. Some turn it **inward**, where it curdles into self-criticism or depression. The style you learned was usually modelled at home, where you watched how anger was or wasn't allowed.

## Reading the signal

Because anger points at what you value, it's worth decoding rather than just managing. What kinds of things reliably anger you? Injustice? Being dismissed? Incompetence? Being controlled? The pattern is a map of your values and your sore spots at once.

This week, look at your anger honestly — how it shows up, what you do with it, and what it tends to be protecting. Naming the thing under the anger is usually more revealing than the anger itself.`,
  },

  // ───────────────────────────────────────────────────────────────
  // Week 3 — The Self Among Others
  // ───────────────────────────────────────────────────────────────
  {
    slug: "attachment",
    title: "How you attach",
    weekNumber: 3,
    blurb: "Your earliest bonds set a template you still use.",
    lectureTitle: "3.1 How you attach",
    body: `# How you attach

The way you connect to the people closest to you has a shape, and that shape is older than any of those relationships. Decades of research on **attachment**, beginning with John Bowlby and Mary Ainsworth, found that our earliest bonds lay down a template for what we expect from intimacy: whether others are reliable, whether needing them is safe, whether closeness is a comfort or a threat.

## The rough patterns

The patterns are usually sketched as **secure** (closeness feels safe, distance is tolerable), **anxious** (closeness is craved, its loss is feared, reassurance never quite lasts), and **avoidant** (independence feels safer than depending on anyone). Most people are a blend, and the pattern can shift with a steady relationship or shake loose under stress.

## Why it's worth naming

You can't choose your starting template, but you can stop mistaking it for the truth about love. Much of what feels like *how relationships simply are* is really how *your* relationships have been, generalised.

This week, describe how you tend to attach — what you do when you want closeness, and what you do when closeness frightens you. The honest version, not the flattering one.`,
  },
  {
    slug: "love",
    title: "How you love",
    weekNumber: 3,
    blurb: "Who you love, and how, reveals what you're seeking.",
    lectureTitle: "3.2 How you love",
    body: `# How you love

Who you're drawn to, and how you behave once you're in it, is not random. We tend to love in patterns — repeating types, repeating dynamics, sometimes repeating the exact unresolved situation we grew up inside, as if trying to win an old argument with new people.

## Love as a mirror

The philosopher and writer Alain de Botton argues that we're often attracted not to what's good for us but to what's *familiar* — and that the familiar, for many, includes a particular kind of difficulty. We may chase the unavailable, or the people who let us play rescuer, or the ones who reproduce a parent's warmth or coldness. None of this is a flaw to be ashamed of; it's a pattern to be seen.

## What you offer and what you seek

It helps to separate two questions: what you *seek* in love (to be seen? rescued? safe? admired? not alone?) and what you actually *offer* (steadiness? intensity? distance dressed as cool?). The gap between them is often where the trouble lives.

This week, describe how you love — the type you reach for, the role you tend to play, and what you're really hoping love will do for you. Brief and honest beats long and impressive.`,
  },
  {
    slug: "recurring-conflicts",
    title: "Your recurring conflicts",
    weekNumber: 3,
    blurb: "The same fight, different faces — what's it really about?",
    lectureTitle: "3.3 Your recurring conflicts",
    body: `# Your recurring conflicts

If you've had the same fight with three different people, the common factor deserves a look. Most of us have a **recurring conflict** — a theme that surfaces again and again across relationships: feeling unappreciated, feeling controlled, feeling abandoned, feeling not listened to, feeling taken advantage of.

## The argument under the argument

Couples researcher John Gottman found that the *content* of a fight (the dishes, the money, the lateness) is usually a stand-in for something deeper and older: a need for respect, for security, for autonomy, for care. The same hidden need can dress itself in a hundred different surface arguments. That's why solving the surface problem rarely ends the pattern.

## Your part in it

The uncomfortable, useful move is to look for *your* contribution — not to take all the blame, but to find the part that travels with you from relationship to relationship. The part that's the same no matter who you're with is the part you can actually work on.

This week, name a conflict that keeps recurring in your relationships, and take an honest guess at the deeper need or fear underneath it. The bravest answers include your own role.`,
  },
  {
    slug: "envy-admiration",
    title: "Envy and admiration",
    weekNumber: 3,
    blurb: "Envy is a clumsy messenger pointing at what you want.",
    lectureTitle: "3.4 Envy and admiration",
    body: `# Envy and admiration

Envy is socially shameful and therefore rarely examined, which is a waste — because envy is one of the most accurate compasses you own. You don't envy everyone who has more than you. You envy specifically, and the specificity is the signal.

## Envy as data

The philosopher Alain de Botton suggests treating envy not as a sin to suppress but as a **clue**: the people who provoke it are showing you, in concentrated form, something you want and don't have. The discomfort is just the wanting, embarrassed. Whose life, exactly, makes you bristle? It's usually not the billionaire or the celebrity — it's the peer, the near-twin, the person whose path you could imagine having taken.

## Admiration, the gentler twin

Admiration points the same way with less sting. Who you look up to — and *for what* — describes the person you'd like to become. Read together, your envies and your admirations sketch an outline of your unlived ideals.

This week, name one person you quietly envy and what exactly the envy is *about*. Done honestly, this points at a value or ambition you may not have admitted you hold.`,
  },
  {
    slug: "unspoken-needs",
    title: "What you need but won't ask for",
    weekNumber: 3,
    blurb: "The needs you hide, and the cost of hiding them.",
    lectureTitle: "3.5 What you need but won't ask for",
    body: `# What you need but won't ask for

There are things you need from other people that you find very hard to ask for — reassurance, help, attention, affection, to be told you did well. Often the needs we hide most carefully are the ones we were taught, early, were too much, or shameful, or unsafe to show.

## The strategy of not asking

Not asking has a logic: you can't be rejected for a request you never made, and you can't be disappointed by a need you've pretended not to have. But the strategy backfires. Unspoken needs don't disappear; they go underground and come out distorted — as resentment that the other person didn't *guess*, as testing, as withdrawal, as a quiet tally of all the times they failed you without knowing the game was on.

## Naming the hunger

Bringing a hidden need into daylight is uncomfortable precisely because it makes you vulnerable. But a need you can name is a need you can actually have met. A need you can't name can only be missed.

This week, name one thing you genuinely need from others but rarely or never ask for — and, if you can, why asking feels dangerous.`,
  },
  {
    slug: "being-seen",
    title: "Being seen",
    weekNumber: 3,
    blurb: "How you handle attention, praise, and exposure.",
    lectureTitle: "3.6 Being seen",
    body: `# Being seen

There's a particular vulnerability in being *seen* — not just looked at, but accurately perceived. Some people crave it and wilt without it; others find it almost unbearable and work hard to stay slightly hidden, even from the people closest to them.

## The double bind

Most of us want to be known and fear being known at the same time. To be truly seen is to risk being seen *and rejected*, which is far worse than being rejected behind a mask. So we manage our visibility carefully: curating, deflecting praise, hiding the parts we're unsure of, keeping a gap between the self we show and the self we are.

## Praise, criticism, and the spotlight

How you handle praise is as telling as how you handle criticism. Do you absorb a compliment or bat it away? Does attention energise you or expose you? The psychologist Carl Rogers argued that growth requires being received with **unconditional positive regard** — being seen *and* accepted. Most of us never quite trust that's on offer, so we hedge.

This week, describe how you handle being seen — attention, praise, exposure — and what you tend to keep hidden even from people who love you.`,
  },
  {
    slug: "solitude",
    title: "Solitude and loneliness",
    weekNumber: 3,
    blurb: "The difference between being alone and feeling alone.",
    lectureTitle: "3.7 Solitude and loneliness",
    body: `# Solitude and loneliness

Being alone and feeling lonely are not the same thing, and the relationship between them is intimate and revealing. Some people are alone often and rarely lonely; others are surrounded and lonely most of the time. Which describes you says a lot about how you relate to yourself.

## Solitude as a skill

The psychiatrist Anthony Storr argued that the **capacity to be alone** is a sign of emotional maturity — that solitude, far from being mere deprivation, is where much creativity, integration, and self-contact happen. People who can't tolerate it often can't tolerate their own company, and stay busy or connected partly to avoid the silence in which uncomfortable thoughts surface.

## Loneliness as a signal

Loneliness, meanwhile, is not a character flaw; it's a signal, like hunger or thirst, that a real need isn't being met. The painful version is loneliness *in company* — the sense of being unmet even when you're not alone. That points at the quality of your connections, not their quantity.

This week, describe your relationship to solitude and to loneliness. When are you most at peace alone, and when does being alone tip into something harder? The honest map is the useful one.`,
  },

  // ───────────────────────────────────────────────────────────────
  // Week 4 — The Self You're Becoming
  // ───────────────────────────────────────────────────────────────
  {
    slug: "strengths",
    title: "What you're unusually good at",
    weekNumber: 4,
    blurb: "Real strengths often hide because they feel effortless.",
    lectureTitle: "4.1 What you're unusually good at",
    body: `# What you're unusually good at

Your real strengths are often invisible to you, for a strange reason: they're easy. The thing you do well without strain doesn't feel like a talent — it feels like *nothing*, like something everyone can do. So you discount it, and chase competence at things that come hard while ignoring the gift sitting in plain sight.

## The trouble with self-assessment

We're poor judges of our own abilities, and the direction of the error varies. The research of Dunning and Kruger is usually quoted to mock overconfidence, but it cuts the other way too: genuinely skilled people often *underestimate* themselves, because what's easy for them looks easy for everyone. Other people frequently see your strengths more clearly than you do.

## Looking for the effortless

To find a real strength, look for what others come to *you* for, what you lose time in, what you can do tired and distracted and still do well. Those are clues to a capacity that's truly yours rather than borrowed or forced.

This week, name something you're genuinely, unusually good at — and resist the urge to downplay it. Owning a strength plainly is harder and more honest than performing modesty.`,
  },
  {
    slug: "weaknesses",
    title: "What you're reliably bad at",
    weekNumber: 4,
    blurb: "Knowing your limits clearly is its own kind of strength.",
    lectureTitle: "4.2 What you're reliably bad at",
    body: `# What you're reliably bad at

Just as some abilities come easily, some difficulties come reliably — the same kind of mistake, the same blind spot, the same thing you keep resolving to fix and keep not fixing. Knowing these clearly, without either excusing or flogging yourself, is a quiet form of maturity.

## Two kinds of weakness

It's worth separating **trait** weaknesses (things that may simply be how you're built — you're disorganised, or impatient, or bad with detail) from **avoidable** ones (things you could change but haven't, often because changing them would cost something you're unwilling to pay). The first you work *around*; the second you actually choose, even if you pretend you don't.

## The honesty test

The tell is the story you tell about the weakness. "I'm just not a numbers person" can be true — or it can be a comfortable exemption you grant yourself. Distinguishing the real limits from the convenient excuses is most of the work, and it's uncomfortable precisely because it removes some excuses.

This week, name something you're reliably bad at, and be honest about which kind it is: a true limit to design around, or a choice you've been dressing up as a limit.`,
  },
  {
    slug: "work-for-free",
    title: "What you'd do for free",
    weekNumber: 4,
    blurb: "Strip away pay and status — what's left is a clue to meaning.",
    lectureTitle: "4.3 What you'd do for free",
    body: `# What you'd do for free

Imagine your needs were met — money handled, status irrelevant, no one to impress. What would you still *do*? Not lie on a beach forever; that gets old fast. What activity would you return to for its own sake, because the doing itself is the reward?

## Intrinsic motivation

Psychologists call this **intrinsic motivation** — doing something because the activity is inherently satisfying, not for any reward it brings. Self-determination theory, developed by Deci and Ryan, finds that the most durable motivation comes from activities that give us a sense of competence, autonomy, and connection. The things you'd do unpaid usually hit at least one of those nerves directly.

## The signal in the noise

Most of us have buried this signal under decades of "shoulds" — what's practical, what pays, what others respect. Clearing that away, even hypothetically, lets the older preference surface. The answer is rarely a job title. It's more often a *kind of activity*: making things, solving puzzles, helping people, performing, understanding, organising, tending.

This week, name what you'd do even if you were never paid or praised for it — and notice what that points to about where your meaning actually lives.`,
  },
  {
    slug: "authority",
    title: "Authority and rules",
    weekNumber: 4,
    blurb: "How you respond to power says who taught you about it.",
    lectureTitle: "4.4 Authority and rules",
    body: `# Authority and rules

Watch yourself in the presence of authority — a boss, an official, an institution, a rule — and you'll see an old pattern run. Some people comply almost automatically; some bristle and resist on principle; some charm; some go quiet and seethe. The reflex is usually older than the present situation.

## Where the reflex was set

How you relate to authority was largely shaped by your first authorities — parents, teachers, whoever held power over you when you were small and couldn't push back. A child who could never win an argument may have become an adult who either submits too easily or fights every rule on reflex. Neither is freedom; both are reactions.

## Rules as a mirror

Your relationship to **rules** is part of the same story. Do they feel like protection, or like a cage? Do you follow them out of agreement, fear, habit, or a wish to be good? Do you break them quietly, loudly, or never? The philosopher Hannah Arendt warned about how much harm comes from people who follow rules without ever asking whether they should — obedience mistaken for virtue.

This week, describe how you respond to authority and rules, and take a guess at who first taught you that response.`,
  },
  {
    slug: "feared-truths",
    title: "What you fear is true",
    weekNumber: 4,
    blurb: "The fear you'd least like confirmed — and what it protects.",
    lectureTitle: "4.5 What you fear is true",
    body: `# What you fear is true

Most people carry a quiet, specific dread about themselves — a thing they're afraid might be true and work hard never to test. *That I'm fundamentally unlovable. That I'm a fraud. That I'm not as good as I pretend. That I'm selfish. That I'll end up alone. That I've wasted it.* The fear runs underground and shapes a surprising amount from there.

## The fear that organises a life

These **core fears** are powerful precisely because we don't examine them; we just arrange our lives to avoid ever finding out. The person afraid they're a fraud overworks to keep the verdict at bay. The person afraid they're unlovable tests everyone or leaves first. Whole personalities can be built as elaborate defences against a single unexamined sentence.

## The relief of saying it

Counterintuitively, naming the feared truth tends to *reduce* its power. Said out loud, it usually turns out to be less a fact than an old, frightened hypothesis — often inherited from a specific time and voice. Unsaid, it gets to run the show from backstage.

This is the most vulnerable prompt in the course, so meet it at your own pace. Name, as honestly as you dare, one thing you're afraid is true about you.`,
  },
  {
    slug: "keep-and-change",
    title: "What you'd keep, what you'd change",
    weekNumber: 4,
    blurb: "Self-acceptance and the will to change, held together.",
    lectureTitle: "4.6 What you'd keep, what you'd change",
    body: `# What you'd keep, what you'd change

Two truths have to be held at once for any real growth: that you are, in important ways, fine as you are — and that some things genuinely need to change. Lean too far toward acceptance and you stagnate; too far toward change and you wage permanent war on yourself. Maturity lives in the tension.

## The paradox of change

The psychologist Carl Rogers noticed a paradox: people change most readily once they feel *accepted as they are*. Self-attack, it turns out, is a poor engine for growth — it tends to produce shame, defensiveness, and paralysis rather than movement. The firmest ground for change is a basic, non-negotiable okayness underneath it.

## Sorting the two piles

So it's worth sorting deliberately. What would you *keep* — the traits, values, and quirks you'd protect even if you could trade them away? And what would you actually change, not to become someone else, but to become more fully yourself? The keep pile matters as much as the change pile; people often can't name a single thing they'd keep, which is its own diagnosis.

This week, name one thing about yourself you'd keep no matter what, and one thing you'd genuinely change.`,
  },
  {
    slug: "becoming",
    title: "Who you're becoming",
    weekNumber: 4,
    blurb: "You are a direction, not just a fixed point.",
    lectureTitle: "4.7 Who you're becoming",
    body: `# Who you're becoming

It's tempting to treat the self as a fixed thing to be discovered, like a statue under marble. But you're less a noun than a verb — not only who you *are* but who you're *becoming*, the direction you're travelling whether or not you chose it on purpose.

## The trajectory question

The philosopher Søren Kierkegaard wrote that "the self is a relation that relates itself to itself" — a clumsy phrase pointing at something real: you are partly made by the stance you take toward your own life. Drift, and you still become someone — usually more of whatever you already were, amplified by habit. Choose, and you get a say.

## Reading your own direction

Look at the last few years as a vector, not a snapshot. Are you becoming more open or more closed, more generous or more guarded, more yourself or more performance? The honest answer isn't always flattering, and that's exactly why it's useful — a trajectory, unlike a fixed trait, can still be turned.

This week, describe the direction you're currently heading — who you're becoming if nothing changes — and whether that's who you want to be. Name one small turn you could make.`,
  },
  {
    slug: "capstone-portrait",
    title: "Capstone: your self-portrait",
    weekNumber: 4,
    blurb: "Gather four weeks of looking into one honest picture.",
    lectureTitle: "4.8 Capstone: your self-portrait",
    body: `# Capstone: your self-portrait

For four weeks you've examined the self you inherited, the self you enact, the self you are among others, and the self you're becoming. The final task is to step back and let the pieces become a picture — not a flattering one, not a brutal one, just a *true* one.

## What a self-portrait is

A good self-portrait, in painting, isn't a list of features; it's a likeness that captures something essential while admitting it can't capture everything. Rembrandt painted himself dozens of times across his life, hiding nothing — the ageing, the failure, the stubbornness — and the honesty is exactly what makes the portraits feel alive. Your written version works the same way: it should be recognisably *you*, contradictions included.

## Holding the contradictions

You are not one consistent thing. You're brave in some rooms and cowardly in others, generous and petty, certain and lost. The aim isn't to resolve that into a tidy summary but to hold it — to know yourself well enough to include the parts that don't fit.

For your final reflection, write a short, honest self-portrait: who you are, as best you can now see, having looked this closely. Let it be brief, and let it be true.`,
  },
];

// ───────────────────────────────────────────────────────────────
// Assignments
// ───────────────────────────────────────────────────────────────
// For this course there are NO correct answers. The `correctAnswer` field below
// holds a short, plausible first-person "model reflection" — a reference for the
// depth a sincere answer tends to reach. It is used internally by the grader, the
// synthetic-student diagnostic, and content audits; it is NEVER shown to the
// student as "the correct answer." Students are graded on sincerity and depth.

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

const HONEST_INSTRUCTIONS =
  "Answer honestly and briefly — a sentence or two is plenty. There are no right answers here; you're graded on sincerity and depth, not length or correctness. Everything you write feeds your evolving self-portrait in Analytics, so the more honest you are, the truer that picture becomes.";

const TIMED_INSTRUCTIONS =
  "This is timed to keep you from over-editing — answer from the gut. Keep each answer short and honest. There are no right answers; you're graded on sincerity and depth, and your answers build your evolving self-portrait.";

const ASSIGNMENTS: SeedAssignment[] = [
  // ───────────── Week 1 ─────────────
  {
    kind: "homework",
    title: "Homework 1.1 — The self you inherited (I)",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "self-concept",
        prompt:
          "In one or two sentences, finish this: 'The way I'd describe myself to a stranger is ___.' Then add one word you'd use about yourself that you'd never say out loud to them.",
        correctAnswer:
          "I'd say I'm easy-going and dependable. The word I'd never say out loud is: tired — or maybe scared.",
        explanation:
          "The gap between your public description and the private word is where the real self-concept lives. Notice which one came easier to write.",
        hint: "The private word matters more than the public sentence.",
      },
      {
        topicSlug: "earliest-memory",
        prompt:
          "Describe one of your earliest memories in two or three sentences. Then, in one line, name the lesson about the world it seems to have taught you.",
        correctAnswer:
          "I remember waiting at a window for someone who was late, watching the street. The lesson: people don't always come when you need them, so don't count on it.",
        explanation:
          "The memory that survived was kept for a reason. The lesson you draw from it is often a belief you still quietly carry.",
      },
      {
        topicSlug: "family-system",
        prompt:
          "What role did you play in your family growing up (e.g. peacemaker, achiever, scapegoat, invisible one)? Name it in a few words, and say where you still play it today.",
        correctAnswer:
          "I was the peacemaker — the one who smoothed things over. I still do it at work, defusing conflict that isn't mine to manage.",
        explanation:
          "The role you were handed often follows you into rooms your family will never see. Spotting it is the first step to choosing it freely or setting it down.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 1.2 — The self you inherited (II)",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "formative-wounds",
        prompt:
          "Name one early hurt that shaped you, and the protective habit it left behind. A sentence or two — you don't need to relive it, just name it.",
        correctAnswer:
          "Being mocked for getting excited about things taught me to play it cool. The habit: I hide how much I care, even when I care a lot.",
        explanation:
          "A defence is intelligent — it solved a real problem once. Naming it lets you ask whether it's still solving a problem you actually have.",
        hint: "Look for a small thing that still produces a big reaction.",
      },
      {
        topicSlug: "abandoned-selves",
        prompt:
          "Name something you once wanted to be or do but set aside. In one line, say when or why that changed.",
        correctAnswer:
          "I wanted to write. I set it aside in my twenties when a job got serious and 'someday' kept getting later.",
        explanation:
          "An abandoned self can linger as a faint ache. Whether it was dropped by choice or by fear tells you something either way.",
      },
      {
        topicSlug: "inherited-values",
        prompt:
          "Name one value you were handed by your family or upbringing. Say honestly whether it's still truly yours, or just still with you.",
        correctAnswer:
          "I was raised to believe rest must be earned. It's still with me, but I don't think I'd choose it from scratch — it mostly makes me feel guilty.",
        explanation:
          "The phrase 'of course' often marks an unexamined inheritance. Auditing one value is how you start getting a vote in what you believe.",
      },
      {
        topicSlug: "self-story",
        prompt:
          "Tell your life so far as a very short story with a shape (e.g. a rise, a comeback, a long wait). Two or three sentences. Then name the shape you reached for.",
        correctAnswer:
          "I drifted for years, then found something that mattered and have been quietly building since. It's a slow-bloom story — a long wait turning into a rise.",
        explanation:
          "The shape you give your life reveals what you believe it means. Notice who you cast as the hero, and who you left out.",
      },
    ],
  },
  {
    kind: "test",
    title: "Test 1 — The Self You Inherited",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 20,
    instructions: TIMED_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "self-concept",
        prompt:
          "One belief about yourself that you suspect is no longer true — but that you keep acting as if it were. Name it in a sentence.",
        correctAnswer:
          "That I'm 'the shy one.' I haven't been for years, but I still hang back as if it were a fixed fact.",
        explanation:
          "Some self-concept stays true only because you keep behaving as if it is. Catching one of those is real progress.",
      },
      {
        topicSlug: "family-system",
        prompt:
          "What felt completely 'normal' in your family that you later realised was specific to it? One or two sentences.",
        correctAnswer:
          "That you never discuss feelings directly. I assumed everyone lived that way until I saw families who actually talk.",
        explanation:
          "The hardest patterns to see are the ones you mistook for reality itself. Naming one loosens its grip.",
      },
      {
        topicSlug: "formative-wounds",
        prompt:
          "What kind of criticism or tone of voice still floods you out of proportion to the moment? Name it briefly.",
        correctAnswer:
          "Being told I'm 'too much.' Even a hint of it can sink my whole day.",
        explanation:
          "Disproportion marks the seam of an old wound — the size of the reaction usually belongs to the past, not the present.",
      },
      {
        topicSlug: "self-story",
        prompt:
          "In your life story, who tends to get the blame — yourself, others, or circumstance? Answer honestly in a line.",
        correctAnswer:
          "Mostly circumstance — bad timing, bad luck. If I'm honest, that lets me off the hook a little too neatly.",
        explanation:
          "Where you assign blame in your own narrative is a habit, not a fact. Seeing the habit is what gives you a choice about it.",
      },
    ],
  },

  // ───────────── Week 2 ─────────────
  {
    kind: "homework",
    title: "Homework 2.1 — The self you enact (I)",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "unwatched-self",
        prompt:
          "What do you actually do with a genuinely free, private hour that no one will ask you about? Be honest, not aspirational. One or two sentences.",
        correctAnswer:
          "I usually scroll, half-watching something, telling myself I'll do the meaningful thing later. Sometimes later comes; mostly it doesn't.",
        explanation:
          "The undefended self — what you reach for with nothing to prove — shows what you actually want versus what you want to be seen wanting.",
        hint: "Aim for what's true, not what sounds good.",
      },
      {
        topicSlug: "avoidances",
        prompt:
          "Name one thing you've been avoiding. Then, more revealingly, what do you think you're protecting by avoiding it? A sentence or two.",
        correctAnswer:
          "I'm avoiding a real conversation with a friend that's overdue. I think I'm protecting the version of the friendship where nothing's wrong.",
        explanation:
          "Behind most avoidances is something you're protecting — an image, a comfort, a relationship you fear testing. Naming it is the point.",
      },
      {
        topicSlug: "energy-map",
        prompt:
          "Name one thing that reliably restores you and one that reliably drains you. Include anything you keep choosing that secretly belongs in the 'drains' column.",
        correctAnswer:
          "Walking alone restores me. Big social events drain me — but I keep saying yes to them and leaving hollow.",
        explanation:
          "Energy is hard to fake to yourself. The thing you 'enjoy' but always leave depleted by is worth a closer look.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2.2 — The self you enact (II)",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "work-and-effort",
        prompt:
          "What does work really mean to you — identity, exchange, proving ground, refuge, something else? Name it, and where you think it came from. A sentence or two.",
        correctAnswer:
          "Work is how I prove I'm worth keeping around. It comes from a childhood where attention only arrived after achievement.",
        explanation:
          "Watch what happens when you're forced to rest — freedom, guilt, or anxiety? The discomfort is the real relationship showing itself.",
      },
      {
        topicSlug: "money-and-security",
        prompt:
          "What does money actually represent to you — safety, freedom, worth, escape, control? Name it, and the feeling that comes up when you imagine having much less.",
        correctAnswer:
          "Money means safety — proof I won't be at anyone's mercy. Imagining much less brings a tight, almost panicky feeling.",
        explanation:
          "Money is rarely about money. The feeling underneath points at the real hunger — and often at something you saw at home.",
      },
      {
        topicSlug: "risk-and-failure",
        prompt:
          "Name one risk you didn't take, and what actually stopped you. One or two sentences.",
        correctAnswer:
          "I didn't apply for a job I wanted abroad. What stopped me was the fear of looking foolish if it didn't work out.",
        explanation:
          "What stopped you usually reveals what you're really optimising for — and whether failure reads to you as a lesson or a verdict.",
      },
      {
        topicSlug: "anger",
        prompt:
          "What kind of thing reliably makes you angry, and what do you tend to do with the anger? Name both, briefly.",
        correctAnswer:
          "Being dismissed or talked over. I rarely show it — I go quiet and cold, then stew about it for hours.",
        explanation:
          "Anger points at what you value or fear. The thing under the anger is usually more revealing than the anger itself.",
      },
    ],
  },
  {
    kind: "test",
    title: "Test 2 — The Self You Enact",
    weekNumber: 2,
    isTimed: true,
    timeLimitMinutes: 20,
    instructions: TIMED_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "unwatched-self",
        prompt:
          "Would the people who admire you most be surprised by how you spend your private time? Answer honestly in a sentence.",
        correctAnswer:
          "A little — they think I'm disciplined, and my private hours are softer and lazier than that picture.",
        explanation:
          "The gap between your performed self and your unwatched self is one of the most honest measures of character you can take.",
      },
      {
        topicSlug: "energy-map",
        prompt:
          "Name one activity you call 'rest' that actually leaves you more depleted. One line.",
        correctAnswer:
          "Doom-scrolling in bed. I call it winding down, but I get up feeling foggier than before.",
        explanation:
          "Telling true restoration from mere numbing is a real and revealing skill. The difference is in how you feel afterward.",
      },
      {
        topicSlug: "money-and-security",
        prompt:
          "What would 'enough' money look like for you — and does any number ever actually feel like enough? Answer briefly.",
        correctAnswer:
          "I tell myself a specific number, but honestly the goalpost moves every time I get close. Nothing's quite felt like enough yet.",
        explanation:
          "If 'enough' keeps moving, the hunger underneath probably isn't really about money at all.",
      },
      {
        topicSlug: "anger",
        prompt:
          "Whose anger did you grow up around, and how do you think it shaped what you do with your own? One or two sentences.",
        correctAnswer:
          "My father's — loud and sudden. I learned to make myself small and swallow mine, which I still do.",
        explanation:
          "Your style of anger was usually modelled at home. Seeing the source helps you choose a different response now.",
      },
    ],
  },
  {
    kind: "midterm",
    title: "Midterm — The Inherited and Enacted Self",
    weekNumber: 2,
    isTimed: true,
    timeLimitMinutes: 40,
    instructions: TIMED_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "self-concept",
        prompt:
          "Two weeks in: name one thing about your self-image that you now see differently than you did before this course. A sentence or two.",
        correctAnswer:
          "I always called myself low-maintenance. I'm starting to see that I just don't ask for things — which isn't the same.",
        explanation:
          "Self-concept shifts when you examine it. Catching one piece in motion is the whole point of looking.",
      },
      {
        topicSlug: "family-system",
        prompt:
          "Connect a pattern from your family to something you still do today. Name the link in one or two sentences.",
        correctAnswer:
          "In my family, love was shown through worry, not words. Now I show care by fretting over people, then wonder why it lands as nagging.",
        explanation:
          "The lathe of the family system shows up in adult habits. Naming the link is how you start to revise it.",
      },
      {
        topicSlug: "abandoned-selves",
        prompt:
          "Is there a set-aside dream you're now wondering whether you abandoned out of fear rather than genuine change of heart? Answer honestly.",
        correctAnswer:
          "Yes — I told myself I 'grew out of' performing music, but really I got scared of not being good enough.",
        explanation:
          "Distinguishing 'I stopped wanting it' from 'I got scared' changes what the memory means — and what's still possible.",
      },
      {
        topicSlug: "avoidances",
        prompt:
          "What's the cost, over years, of one thing you habitually avoid? Name it in a sentence or two.",
        correctAnswer:
          "Avoiding conflict has cost me honesty in my closest relationships — people don't fully know what I think or want.",
        explanation:
          "Avoidance defers its cost, which is why it lasts. Naming the long bill makes the trade visible.",
      },
      {
        topicSlug: "work-and-effort",
        prompt:
          "When you rest, what feeling actually shows up — relief, guilt, anxiety, emptiness? Name it and what it tells you.",
        correctAnswer:
          "Guilt, mostly, like I'm getting away with something. It tells me I've tied my worth to output more than I admit.",
        explanation:
          "The feeling that arrives in forced rest is the clearest readout of your real relationship to effort.",
      },
      {
        topicSlug: "risk-and-failure",
        prompt:
          "Does failure read to you as information or as a verdict on your worth? Answer honestly, with one example.",
        correctAnswer:
          "A verdict, if I'm honest. When a project flopped last year I didn't think 'lesson learned' — I thought 'I knew I wasn't good enough.'",
        explanation:
          "Whether failure is a lesson or a sentence quietly decides how much you'll ever let yourself attempt.",
      },
    ],
  },

  // ───────────── Week 3 ─────────────
  {
    kind: "homework",
    title: "Homework 3.1 — The self among others (I)",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "attachment",
        prompt:
          "When you want closeness from someone, what do you actually do? And when closeness starts to frighten you, what do you do then? The honest version, in a sentence or two.",
        correctAnswer:
          "When I want closeness I get extra helpful, hoping they'll come closer. When it scares me, I go quiet and find reasons to need space.",
        explanation:
          "Your attachment pattern is older than any current relationship. Naming what you do in both directions makes the template visible.",
      },
      {
        topicSlug: "love",
        prompt:
          "Describe the 'type' you tend to fall for, or the role you tend to play in love. What do you secretly hope love will do for you? One or two sentences.",
        correctAnswer:
          "I fall for slightly unavailable people and play the patient one. I think I'm hoping to finally be chosen by someone who's hard to win.",
        explanation:
          "We often love what's familiar rather than what's good for us. The hope underneath the pattern is the revealing part.",
      },
      {
        topicSlug: "recurring-conflicts",
        prompt:
          "Name a conflict that keeps recurring across your relationships, and take a guess at the deeper need or fear underneath it. Include your own role if you can.",
        correctAnswer:
          "I keep feeling unappreciated and end up keeping score. Underneath is a fear I only matter for what I do, not who I am — and I rarely just say I feel unseen.",
        explanation:
          "The content of a recurring fight usually stands in for an older need. The part that travels with you is the part you can work on.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 3.2 — The self among others (II)",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "envy-admiration",
        prompt:
          "Name one person you quietly envy, and say exactly what the envy is about. One or two sentences.",
        correctAnswer:
          "A former colleague who left to do her own thing. The envy isn't about money — it's about her nerve to bet on herself.",
        explanation:
          "Envy is specific, and the specificity is the signal. It usually points at a value or ambition you haven't admitted you hold.",
        hint: "It's usually a peer, not a celebrity.",
      },
      {
        topicSlug: "unspoken-needs",
        prompt:
          "Name one thing you genuinely need from others but rarely or never ask for — and, if you can, why asking feels dangerous.",
        correctAnswer:
          "Reassurance that I'm wanted. Asking feels dangerous because if I have to ask, the answer wouldn't count.",
        explanation:
          "Unspoken needs don't vanish; they come out sideways as resentment or testing. A named need is one that can actually be met.",
      },
      {
        topicSlug: "being-seen",
        prompt:
          "How do you handle being truly seen — praise, attention, exposure? And what do you keep hidden even from people who love you? A sentence or two.",
        correctAnswer:
          "I deflect praise with a joke. What I keep hidden is how unsure I am underneath the competent act.",
        explanation:
          "How you handle praise is as telling as how you handle criticism. The gap you maintain between shown and real self is the thing to notice.",
      },
      {
        topicSlug: "solitude",
        prompt:
          "When are you most at peace alone, and when does being alone tip into loneliness? Name both, briefly.",
        correctAnswer:
          "I'm at peace alone when I'm absorbed in making something. It tips into loneliness in the evenings, when there's no one to tell about my day.",
        explanation:
          "Being alone and feeling lonely aren't the same. Where the line falls for you says a lot about how you relate to yourself.",
      },
    ],
  },
  {
    kind: "test",
    title: "Test 3 — The Self Among Others",
    weekNumber: 3,
    isTimed: true,
    timeLimitMinutes: 20,
    instructions: TIMED_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "attachment",
        prompt:
          "Under stress in a close relationship, do you move toward the person, away, or against them? Answer in a line, with an example if you can.",
        correctAnswer:
          "Away. When things get tense I go cold and busy myself, then resent that they didn't chase me.",
        explanation:
          "Stress reveals the attachment template most clearly. The move you make under pressure is the honest one.",
      },
      {
        topicSlug: "recurring-conflicts",
        prompt:
          "What's the part of your recurring conflict that's the same no matter who you're with? Name it honestly.",
        correctAnswer:
          "I withdraw instead of saying what I need, then blame the other person for not noticing.",
        explanation:
          "The constant across different partners is the part that's yours to change — uncomfortable, but workable.",
      },
      {
        topicSlug: "unspoken-needs",
        prompt:
          "When a need of yours goes unmet, how does it usually come out instead of as a direct request? One line.",
        correctAnswer:
          "As sulking, or a sharp comment that I pretend is a joke.",
        explanation:
          "Hidden needs leak out distorted. Spotting your particular distortion lets you trace it back to the need underneath.",
      },
      {
        topicSlug: "solitude",
        prompt:
          "Have you ever felt lonely while surrounded by people? When, and what was missing? Answer briefly.",
        correctAnswer:
          "Often, at family gatherings — everyone's there but no one really asks anything real, so I feel unseen in a full room.",
        explanation:
          "Loneliness in company points at the quality of your connections, not their number.",
      },
    ],
  },

  // ───────────── Week 4 ─────────────
  {
    kind: "homework",
    title: "Homework 4.1 — The self you're becoming (I)",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "strengths",
        prompt:
          "Name something you're genuinely, unusually good at — and resist downplaying it. What do people come to you for? One or two sentences.",
        correctAnswer:
          "I'm unusually good at making people feel at ease. People come to me to talk things through; I just thought everyone could do it.",
        explanation:
          "Real strengths often feel effortless, so we discount them. Owning one plainly is harder and more honest than performing modesty.",
        hint: "Look for what's easy for you but hard for others.",
      },
      {
        topicSlug: "weaknesses",
        prompt:
          "Name something you're reliably bad at. Be honest about which it is: a true limit to design around, or a choice you've dressed up as a limit.",
        correctAnswer:
          "Follow-through on long projects. I've called it 'not being a detail person,' but really I avoid the boring middle because it's hard.",
        explanation:
          "The story you tell about a weakness reveals whether it's a real limit or a convenient exemption.",
      },
      {
        topicSlug: "work-for-free",
        prompt:
          "What would you still do even if you were never paid or praised for it? Name it, and what it points to about where your meaning lives.",
        correctAnswer:
          "I'd still fix and build things with my hands. It points to a need to make something real and see it work.",
        explanation:
          "Strip away pay and status and what's left is intrinsic motivation — usually a kind of activity, not a job title.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 4.2 — The self you're becoming (II)",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: HONEST_INSTRUCTIONS,
    problems: [
      {
        topicSlug: "authority",
        prompt:
          "How do you respond to authority and rules — comply, resist, charm, seethe? Name your reflex and take a guess at who first taught it. One or two sentences.",
        correctAnswer:
          "I comply on the surface and resent quietly. I think I learned it with a father you couldn't argue with — you just waited him out.",
        explanation:
          "Your reflex toward authority is usually older than the present situation. Tracing it to its source loosens the automatic part.",
      },
      {
        topicSlug: "feared-truths",
        prompt:
          "As honestly as you dare, name one thing you're afraid is true about you. Go at your own pace — a few words is enough.",
        correctAnswer:
          "That underneath the competence, I'm a fraud who's just been lucky so far.",
        explanation:
          "Said out loud, a feared truth usually turns out to be an old, frightened hypothesis rather than a fact. Unsaid, it runs the show from backstage.",
      },
      {
        topicSlug: "keep-and-change",
        prompt:
          "Name one thing about yourself you'd keep no matter what, and one thing you'd genuinely change. A sentence or two.",
        correctAnswer:
          "I'd keep my curiosity — it's never let me down. I'd change how much I let fear of judgment shrink what I attempt.",
        explanation:
          "Growth needs both: acceptance and the will to change. Many people can't name a single thing they'd keep — which is its own diagnosis.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final — Your Self-Portrait",
    weekNumber: 4,
    isTimed: true,
    timeLimitMinutes: 60,
    instructions:
      "This is the capstone. Answer from what you've learned over four weeks — honestly, and still briefly. There are no right answers; you're graded on sincerity and depth. These final answers complete your evolving self-portrait in Analytics.",
    problems: [
      {
        topicSlug: "becoming",
        prompt:
          "Describe the direction you're currently heading — who you're becoming if nothing changes. Is that who you want to be? Name one small turn you could make.",
        correctAnswer:
          "If nothing changes, I'm becoming safer and smaller — more guarded each year. That's not who I want to be. One turn: say the honest thing once a day instead of swallowing it.",
        explanation:
          "A trajectory, unlike a fixed trait, can still be turned. Naming the direction and one small turn is how you get a say.",
      },
      {
        topicSlug: "feared-truths",
        prompt:
          "Having sat with it for a week: does the thing you fear is true about you read more like a fact, or like an old hypothesis you inherited? Answer honestly.",
        correctAnswer:
          "More like an old hypothesis — it sounds a lot like things I was told young. It's lost some of its weight just from saying it plainly.",
        explanation:
          "Naming a feared truth tends to shrink it. Seeing it as inherited rather than factual is often where the relief lives.",
      },
      {
        topicSlug: "strengths",
        prompt:
          "What's one strength you've come to own more honestly over this course? One or two sentences.",
        correctAnswer:
          "That I'm steady for other people in a crisis. I used to wave it off; now I see it's genuinely rare and mine.",
        explanation:
          "Owning a strength without flinching is its own milestone. Notice if it was easier to write than it would have been four weeks ago.",
      },
      {
        topicSlug: "recurring-conflicts",
        prompt:
          "What's one pattern in how you relate to others that you understand better now than you did four weeks ago? Name it briefly.",
        correctAnswer:
          "That I withdraw and then punish people for not reading my mind. I can at least catch myself starting it now.",
        explanation:
          "Understanding a pattern doesn't end it, but it interrupts the automatic part — and that's where change starts.",
      },
      {
        topicSlug: "keep-and-change",
        prompt:
          "After four weeks of looking, what's the single most important thing you'd keep about yourself? Answer in a line.",
        correctAnswer:
          "My willingness to keep looking honestly, even when what I find isn't flattering.",
        explanation:
          "The 'keep' pile matters as much as the 'change' pile. What you'd protect about yourself is a quiet statement of your values.",
      },
      {
        topicSlug: "capstone-portrait",
        prompt:
          "Write a short, honest self-portrait: who you are, as best you can now see, contradictions included. Keep it brief and true — a few sentences.",
        correctAnswer:
          "I'm warm but guarded, curious but easily scared off, generous with others and stingy with myself. I want to be seen and I hide. I'm slowly choosing to hide a little less.",
        explanation:
          "A true self-portrait captures something essential while admitting it can't capture everything. Holding the contradictions is the achievement.",
      },
    ],
  },
];

const EXPECTED_TOPIC_SLUGS = TOPICS.map((t) => t.slug).sort().join(",");

// Bump this whenever lecture bodies, assignment problems, or model reflections
// change in a way that should propagate to the database on the next boot.
// The value is stored alongside topics and compared in seedIfEmpty.
const CONTENT_REVISION = "2026-05-29.know-thyself.r1";

// A stable sentinel phrase that appears verbatim in the 1.1 lecture body. The
// drift check below greps the seeded `self-concept` lecture for this phrase; if
// it's missing (or the slug set changed), the content has drifted and we reseed.
// Keep this in sync with the `self-concept` lecture body above.
const REVISION_SENTINEL = "the slow work of turning the second one over in your hands";

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
    const slugsMatch = actualSlugs === EXPECTED_TOPIC_SLUGS;
    // Confirm the seeded content matches the current revision by checking the
    // `self-concept` lecture body for a stable sentinel phrase.
    let revisionMatches = false;
    try {
      const lec = await db.execute(
        sql`select l.body from lectures l join topics t on l.topic_id = t.id where t.slug = 'self-concept' limit 1`,
      );
      const body = ((lec.rows[0] ?? {}) as { body?: string }).body ?? "";
      revisionMatches = body.includes(REVISION_SENTINEL);
    } catch {
      revisionMatches = false;
    }
    if (slugsMatch && revisionMatches) {
      logger.info(
        { revision: CONTENT_REVISION },
        "Seed: already populated with current content, skipping",
      );
      return;
    }
    logger.info(
      { revision: CONTENT_REVISION, slugsMatch, revisionMatches },
      "Seed: course content drifted from expected revision — wiping and re-seeding",
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
