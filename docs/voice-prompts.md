# Bangla voice prompts (16699 keypad call)

The 16699 prototype runs like a phone IVR line. A recorded clip asks each question; the caller answers choices and the safe number on the keypad, speaks other answers after a beep and presses **#** when finished, and presses **\*** to hear a question again. The beep and key tones are generated in the browser; only the clips below are audio files.

All 19 clips were supplied on 2026-09-23 and live in `client/public/audio/` (48 kbps mono MP3, 4–14 seconds each). Each was checked with Whisper against this script, and the digit order it announces matches the answer order in `client/src/utils/voiceScript.js`. If a clip is re-recorded, keep that order: key **1** is always the first choice listed in the script.

## How to re-record

1. Record in a quiet room, one clip per row, reading the **Bangla** column naturally and unhurried. Say "হ্যাশ" and "স্টার" as words.
2. Save each clip as MP3 with the exact file name in the first column (names are case-sensitive).
3. Keep clips mono and small (about 32–48 kbps) so the page stays usable on slow connections.
4. A missing file is not an error: that question simply shows on screen without audio.
5. The greeting carries the call-recording notice, a legal statement: have the law team approve its wording.

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

Pressing any key while a clip plays cuts it short (type-ahead). A spoken answer that runs past 20 seconds (3 minutes for the problem) is sent automatically.

## Also useful

Record one extra clip of a fictional caller answering, for testing Bangla transcription end to end:

- `npm run check:voice --workspace server -- path/to/sample.webm` transcribes it and shows what the AI extracted.
- `LIVE_VOICE_SAMPLE=path/to/sample.wav npm run test:e2e` runs the opt-in browser test that speaks that clip into the page.
