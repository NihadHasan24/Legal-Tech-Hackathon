# Bangla voice prompts (16699 keypad call)

The 16699 prototype runs like a phone IVR line. A recorded clip asks each question; after the beep the caller answers every question by voice (then pauses or presses **#**) or on the keypad, and presses **\*** to hear a question again. A spoken safe number is read back digit by digit and must be confirmed. The beep and key tones are generated in the browser; only the clips below are audio files.

All 19 clips were supplied on 2026-09-23 and live in `client/public/audio/` (48 kbps mono MP3, 4–14 seconds each). Each was checked with Whisper against this script, and the digit order it announces matches the answer order in `client/src/utils/voiceScript.js`. If a clip is re-recorded, keep that order: key **1** is always the first choice listed in the script.

## How to re-record

1. Record in a quiet room, one clip per row, reading the **Bangla** column naturally and unhurried. Say "হ্যাশ" and "স্টার" as words.
2. Save each clip as MP3 with the exact file name in the first column (names are case-sensitive).
3. Keep clips mono and small (about 32–48 kbps) so the page stays usable on slow connections.
4. A missing file is not an error: that question simply shows on screen without audio.
5. The greeting carries the call-recording notice, a legal statement: have the law team approve its wording.
6. The recorded clips below still say only how to use the keypad. Re-record them with the wording in **Voice answers** below; the page already accepts both voice and keys, so the old clips keep working until then.

## Voice answers: clips to re-record (15) and add (11)

Say the quoted words exactly as written: they are the words callers will copy. A caller may also say the key number ("এক", "দুই", "তিন").

| File | New Bangla |
| --- | --- |
| `urgent.mp3` | এই মুহূর্তে কেউ কি তাৎক্ষণিক বিপদে আছেন? থাকলে "হ্যাঁ" বলুন বা ১ চাপুন; না থাকলে "না" বলুন বা ২ চাপুন। |
| `callerRole.mp3` | নিজের জন্য ফোন করলে "নিজের জন্য" বলুন বা ১ চাপুন; অন্য কারও পক্ষে ফোন করলে "অন্য কারও পক্ষে" বলুন বা ২ চাপুন। |
| `callerName.mp3` | আপনার নাম বলুন। বলা শেষ হলে একটু থামুন বা হ্যাশ চাপুন। |
| `relationship.mp3` | যাঁর পক্ষে ফোন করছেন, তিনি আপনার কী হন বলুন। বলা শেষ হলে একটু থামুন বা হ্যাশ চাপুন। |
| `applicantName.mp3` | যিনি আইনি সহায়তা চান, তাঁর নাম বলুন। বলা শেষ হলে একটু থামুন বা হ্যাশ চাপুন। |
| `identityDocument.mp3` | আবেদনকারীর জাতীয় পরিচয়পত্র বা অন্য কোনো পরিচয়পত্র এখন হাতের কাছে আছে কি? নম্বর বলবেন না। থাকলে "আছে" বলুন বা ১ চাপুন; না থাকলে "নেই" বলুন বা ২ চাপুন; না জানলে "জানি না" বলুন বা ৩ চাপুন। |
| `problem.mp3` | এবার সমস্যাটি নিজের ভাষায় খুলে বলুন। যতটুকু বলতে স্বস্তি বোধ করেন, ততটুকুই বলুন। বলা শেষ হলে একটু থামুন বা হ্যাশ চাপুন। |
| `district.mp3` | আবেদনকারী কোন জেলায় থাকেন বলুন। বলা শেষ হলে একটু থামুন বা হ্যাশ চাপুন। |
| `contactChannel.mp3` | নিরাপদ কোনো নম্বরে ফোনে যোগাযোগ চাইলে "ফোন" বলুন বা ১ চাপুন; সরাসরি লিগ্যাল এইড অফিসে এসে কথা বলতে চাইলে "অফিস" বলুন বা ২ চাপুন। |
| `contactValue.mp3` | যে নম্বরে ফোন করা নিরাপদ, সেটি বলুন বা কিপ্যাডে চাপুন। শেষে একটু থামুন বা হ্যাশ চাপুন। **Record this one together with the 11 new clips below:** until they all exist, the number is keypad-only. |
| `contactOwner.mp3` | নম্বরটি আবেদনকারীর নিজের হলে "আবেদনকারীর নম্বর" বলুন বা ১ চাপুন; আপনার হলে "আমার নম্বর" বলুন বা ২ চাপুন। |
| `safeTime.mp3` | কোন সময়ে যোগাযোগ করা নিরাপদ বলুন। বলা শেষ হলে একটু থামুন বা হ্যাশ চাপুন। |
| `smsSafe.mp3` | এই নম্বরে এসএমএস পাঠানো নিরাপদ হলে "হ্যাঁ" বলুন বা ১ চাপুন; নিরাপদ না হলে "না" বলুন বা ২ চাপুন। |
| `readback.mp3` | আপনার দেওয়া তথ্যগুলো স্ক্রিনে দেখে নিন। সব ঠিক থাকলে "জমা দিন" বলুন বা ১ চাপুন। |
| `digit0.mp3` … `digit9.mp3` *(new)* | শূন্য · এক · দুই · তিন · চার · পাঁচ · ছয় · সাত · আট · নয় — one word per file, no silence before or after, so a number plays back smoothly. |
| `numberConfirm.mp3` *(new)* | আপনি এই নম্বরটি বলেছেন। ঠিক হলে "হ্যাঁ" বলুন বা ১ চাপুন; ভুল হলে "না" বলুন বা ২ চাপুন। (Plays right after the digits.) |

The spoken number is read back only in Bangla mode with light mode off, because that is when the clips play; otherwise it stays keypad-only.

## Clips (19)

| File | When it plays | Bangla | Keys |
| --- | --- | --- | --- |
| `greeting.mp3` | Call starts | লিগ্যাল এইড হেল্পলাইন ১৬৬৯৯-এ আপনাকে স্বাগতম। সেবার মান ও আপনার আবেদনের জন্য এই কলটি রেকর্ড করা হচ্ছে। এখন কয়েকটি ছোট প্রশ্ন করব। কোনো প্রশ্ন আবার শুনতে স্টার চাপুন। | — |
| `urgent.mp3` | First question | এই মুহূর্তে কেউ কি তাৎক্ষণিক বিপদে আছেন? থাকলে ১ চাপুন, না থাকলে ২ চাপুন। | 1 yes, 2 no |
| `callerRole.mp3` | | নিজের জন্য ফোন করলে ১ চাপুন, অন্য কারও পক্ষে ফোন করলে ২ চাপুন। | 1 self, 2 someone else |
| `callerName.mp3` | Only for a representative | আপনার নাম বলুন। বলা শেষ হলে হ্যাশ চাপুন। | speak, then # |
| `relationship.mp3` | Only for a representative | যাঁর পক্ষে ফোন করছেন, তিনি আপনার কী হন বলুন। বলা শেষ হলে হ্যাশ চাপুন। | speak, then # |
| `applicantName.mp3` | | যিনি আইনি সহায়তা চান, তাঁর নাম বলুন। বলা শেষ হলে হ্যাশ চাপুন। | speak, then # |
| `identityDocument.mp3` | | আবেদনকারীর জাতীয় পরিচয়পত্র বা অন্য কোনো পরিচয়পত্র এখন হাতের কাছে থাকলে ১, না থাকলে ২, না জানলে ৩ চাপুন। | 1 available, 2 not, 3 don't know |
| `problem.mp3` | | এবার সমস্যাটি নিজের ভাষায় খুলে বলুন। যতটুকু বলতে স্বস্তি বোধ করেন, ততটুকুই বলুন। বলা শেষ হলে হ্যাশ চাপুন। | speak (up to 3 min), then # |
| `district.mp3` | | আবেদনকারী কোন জেলায় থাকেন বলুন। বলা শেষ হলে হ্যাশ চাপুন। | speak, then # |
| `contactChannel.mp3` | | নিরাপদ কোনো নম্বরে ফোনে যোগাযোগ চাইলে ১ চাপুন; সরাসরি লিগ্যাল এইড অফিসে এসে কথা বলতে চাইলে ২ চাপুন। | 1 phone, 2 in person |
| `contactValue.mp3` | Phone contact, or danger callback | যে নম্বরে ফোন করা নিরাপদ, সেটি কিপ্যাডে চাপুন। শেষে হ্যাশ চাপুন। | digits, then # |
| `contactOwner.mp3` | Representative with phone contact | নম্বরটি আবেদনকারীর নিজের হলে ১, আপনার হলে ২ চাপুন। | 1 applicant's, 2 caller's |
| `safeTime.mp3` | | কোন সময়ে যোগাযোগ করা নিরাপদ বলুন। বলা শেষ হলে হ্যাশ চাপুন। | speak, then # |
| `smsSafe.mp3` | Phone contact | এই নম্বরে এসএমএস পাঠানো নিরাপদ হলে ১, নিরাপদ না হলে ২ চাপুন। | 1 safe, 2 not safe |
| `readback.mp3` | Before submission | আপনার দেওয়া তথ্যগুলো স্ক্রিনে দেখে নিন। সব ঠিক থাকলে জমা দিতে ১ চাপুন। | 1 submit |
| `submitted.mp3` | After submission | ধন্যবাদ। আপনার আবেদন জমা হয়েছে। একজন লিগ্যাল এইড কর্মকর্তা আবেদনটি দেখে আপনার সাথে যোগাযোগ করবেন। | — |
| `wrongKey.mp3` | Key that is not an option | এই বোতামটি এখানে কাজ করে না। প্রশ্নটি আবার শুনুন। | then the question repeats |
| `noInput.mp3` | No key for 12 s, # with no speech, or speech not understood | কোনো উত্তর শুনতে পাইনি। প্রশ্নটি আবার শুনুন। | then the question repeats (twice at most on silence) |
| `urgentHandoff.mp3` | Caller pressed 1 for danger | আপনার নিরাপত্তাই সবার আগে। এখন শুধু যোগাযোগের তথ্য নেব, একজন কর্মী দ্রুত আপনাকে ফোন করবেন। জীবন বা নিরাপত্তা এখনই ঝুঁকিতে থাকলে এখনই ৯৯৯-এ ফোন করুন। | — |

Pressing any key while a clip plays cuts it short (type-ahead). A spoken answer also ends by itself once the caller has spoken and then stayed quiet for 2.5 seconds (4 seconds for the problem, 1.5 seconds for a yes/no or choice), so a blind caller never has to find the # key; the short low tone that follows means the system stopped listening. This is a loudness check in the browser only, so no audio goes anywhere new; in a room that never goes quiet, # still ends the answer. A spoken answer that runs past 20 seconds (3 minutes for the problem) is sent automatically.

## Also useful

Record one extra clip of a fictional caller answering, for testing Bangla transcription end to end:

- `npm run check:voice --workspace server -- path/to/sample.webm` transcribes it and shows what the AI extracted.
- `LIVE_VOICE_SAMPLE=path/to/sample.wav npm run test:e2e` runs the opt-in browser test that speaks that clip into the page.
