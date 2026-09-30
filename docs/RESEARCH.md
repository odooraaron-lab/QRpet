# Research notes: learning by age, and how similar characters work

Short desk research (September 2026) behind the v2 changes. Sources are listed at the end.

## 1. What children can learn at each age

| Age | Maths | Language / other | What QR does with it |
| --- | --- | --- | --- |
| **2 to 3** | Counting starts; understands "more" and "same"; sees groups of up to 3 at a glance (subitising); first shapes (circle, square, triangle) around 2 | Colours are typically taught from about 18 months to 2½; pre-alphabet stage (sounds, books) | Two big choices only. Colours, shapes, animal sounds ("Who says moo?"), big/small, counting stars to 3–5, peekaboo (object permanence), feeding by colour |
| **4 to 5** | Counts to 10–20; recognises numbers; sees up to 5 at a glance; patterns; compares amounts and sizes | Letter names and sounds grow through this stage | Three choices. Counting to 10 (and back), "How many?", more/fewer, AB patterns, letter find ("B is for bear"), memory pairs, "Feed me 3!", odd one out |
| **6+** | Counts to 100; adds and takes away within 20 (NZ Year 1: counting, grouping and sharing) | Uses letters to read and write; phonics (first sounds) | Four choices. Counting to 20, adding and taking away within 10 (with pictures), ABC/AAB patterns, first sounds of words, bigger memory boards |

NZ's early-years curriculum (Te Whāriki) treats maths as part of everyday play across pattern, measuring, sorting,
locating, counting and grouping, and shape. So QR mixes these into play (feeding, peekaboo, songs) rather than
running them as lessons.

**Design rules we took from the research and from children's-app UX guidance:**
- **Speak everything.** Children under about 7 shouldn't need to read, so every prompt is spoken. The screen shows one or two words at most, plus pictures.
- **Big targets.** 60–80 pt or more, well spaced. The kid screen's buttons are 90–180 px.
- **No failure.** A wrong tap wiggles and QR says "Try again!". After two misses QR shows the answer and cheers anyway.
- **Adapt gently.** Like Khan Academy Kids' adaptive path, each game gets a notch harder when a child gets every round right first time, and a notch easier after lots of misses. The level is remembered on that device.
- **Reward with visuals, not points.** Sparkles, confetti and a dance. No currency, no streaks to lose.

## 2. How similar characters handle phones and websites

| Product | How you get in | Phone / web | What they get right | What goes wrong / what we avoid |
| --- | --- | --- | --- | --- |
| **Webkinz** | Each plush toy has a **code** that unlocks the pet online | Browser (back in 2025) plus iOS/Android apps | The code-on-a-physical-thing model. It's exactly our QR card + buddy code | Virtual currency and shops |
| **Epic! (kids reading)** | A 7-character **class code**, no email for the child | Web + apps; any number of devices on one code | Kids get in by typing a code; adults manage the account | – |
| **My Talking Tom** | App install | Phone apps | Instant touch reactions: every tap does something funny | Ads, aggressive in-app purchases, voice recording shared with ad partners. **We don't record anything and have no ads or purchases** |
| **Pou / Tamagotchi** | App / toy | Phone | Feeding, dressing up, a room that changes, growth stages | Hunger and neglect penalties, coins. **QR never gets sick or sad; feeding is just for fun** |
| **Hatchimals** | Physical toy | – | Hatching takes 25–60 minutes of tapping and rubbing; the waiting and nurturing builds excitement (also used to teach patience) | – |
| **Khan Academy Kids, Duolingo ABC** | Parent sets up; picks the child's age at onboarding | Apps | Age-based starting level, adaptive after that, ad-free | – |
| **Apple Kids category rules** | – | iOS | Links out, purchases, settings and permissions must sit **behind a parental gate** | – |

**What we changed because of it:**
- **Code instead of email** (Webkinz, Epic): every buddy has a code like `MOON-TIGER-APPLE-27`, printed under the QR card. Typing it on any phone, tablet or TV opens the buddy for good, and the parent can replace it any time. Email is only for recovery.
- **Parental gate** (Apple 1.3): nothing visible to the child. Press and hold the top-right corner for 3 seconds, then the 4-digit parent PIN. Five wrong tries lock it for 10 minutes.
- **The egg** (Hatchimals): the egg stays an egg for three visits, wiggling and cracking more each day, with eyes peeking out on day three. On the fourth visit the child taps it open.
- **Touch reactions** (Talking Tom): every tap on QR does something different (giggle, boing, spin, sneeze, hearts, says the child's name, counts, names a colour…). Tapping the room pops a musical bubble.
- **Feeding** (Pou/Tamagotchi, without the guilt): a snack tray. QR munches, says "Yum!", pulls a face at broccoli, and gets full after six snacks.
- **Phones:** "Add to Home Screen" support (a web app manifest per buddy, full screen). The screen stays awake while playing. The parent page explains Guided Access (iPhone/iPad) and App pinning (Android) to keep a child inside the buddy.

## Sources

- [Math milestones by age (DreamBox)](https://www.dreambox.com/math/guides/math-milestones-by-age)
- [Math learning milestones ages 3–7 (Funexpected)](https://funexpectedapps.com/en/blog-posts/math-learning-milestones-ages-3-to-7-explained)
- [Mathematics milestones, birth to grade 2 (FHSU)](https://fhsu.pressbooks.pub/ecumath/chapter/chapter-6-mathematics-milestones-birth-to-second-grade/)
- [Literacy milestones ages 3–4 (Reading Rockets)](https://www.readingrockets.org/topics/developmental-milestones/articles/literacy-milestones-ages-3-4)
- [When to teach colours, shapes and letters (Teach My Toddlers)](https://teachmytoddlers.com/when-to-teach-what-a-guide-for-teaching-your-toddler-colors-shapes-letters-and-more/)
- [Pāngarau / Mathematics – Te Whāriki Online](https://tewhariki.tahurangi.education.govt.nz/p-ngarau-mathematics/5637164155.p)
- [Mathematics and statistics in Year 1 (NZ Ministry of Education)](https://www.education.govt.nz/parents-and-caregivers/schools-year-0-13/parent-portal/guide-for-the-new-zealand-curriculum-years-0-to-8/year-1-new-zealand-curriculum/mathematics-and-statistics-in-year-1)
- [Khan Academy Kids review (Common Sense Media)](https://www.commonsensemedia.org/app-reviews/khan-academy-kids) and [Khan Academy Kids guide (edu.com)](https://www.edu.com/blog/understanding-khan-academy-kids-a-complete-guide-for-k-2-teachers-and-parents)
- [Duolingo ABC guide (Lingoly)](https://lingoly.io/duolingo-abc/)
- [My Talking Tom 2 review (Common Sense Media)](https://www.commonsensemedia.org/app-reviews/my-talking-tom-2) and [Is Talking Tom safe? (JoinDeleteMe)](https://joindeleteme.com/is-site-safe/is-talking-tom-safe/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Parental gate explainer](https://medium.com/@laurentm/apple-ios-app-store-guidelines-for-kids-category-the-parental-gate-fa4ba10edd6f)
- [Webkinz (Wikipedia)](https://en.wikipedia.org/wiki/Webkinz) and [Webkinz returns to browsers in 2025](https://webkinznewz.ganzworld.com/announcements/webkinz-returns-to-browsers-in-2025/)
- [Epic: how students log in with a class code](https://support.getepic.com/hc/en-us/articles/115001263046-How-do-my-students-log-into-my-educator-classroom)
- [Hatchimals hatching (MadeForMums)](https://www.madeformums.com/news/hatchimals-worth-the-money-see-one-hatch-here/) and [Hatchimals (Wikipedia)](https://en.wikipedia.org/wiki/Hatchimals)
- [Designing for kids: cognitive considerations (NN/g)](https://www.nngroup.com/articles/kids-cognition/) and [UI/UX design for children (Aufait UX)](https://www.aufaitux.com/blog/ui-ux-designing-for-children/)
- [Guided Access on iPhone and iPad (Findmykids)](https://findmykids.org/blog/en/guided-access-iphone-ipad)
