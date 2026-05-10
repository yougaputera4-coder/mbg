// ========================================
// QUESTIFY - Main JavaScript
// ========================================

// --- Global State ---
const state = {
    currentLevel: 'easy',
    currentGame: null,
    score: 0,
    totalScore: 0,
    timer: null,
    timeLeft: 0,
    soundEnabled: true,
    audioCtx: null,
    gameProgress: {},
    currentQuestion: 0,
    correctCount: 0,
    totalQuestions: 0,
    gameData: null
};

// --- Sound System ---
function initAudio() {
    if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!state.soundEnabled || !state.audioCtx) return;
    try {
        const ctx = state.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'win') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            osc.frequency.setValueAtTime(1047, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        } else if (type === 'tick') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        }
    } catch (e) {}
}

function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    const btn = document.getElementById('sound-toggle');
    if (btn) {
        btn.classList.toggle('muted', !state.soundEnabled);
        btn.innerHTML = state.soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    }
    if (state.soundEnabled) initAudio();
}

// --- Confetti System ---
class ConfettiSystem {
    constructor() {
        this.canvas = document.getElementById('confetti-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.running = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        const colors = ['#ff2a9d', '#00e1ff', '#9a4dff', '#00ff9d', '#ffee00', '#ff9900'];
        return {
            x: Math.random() * this.canvas.width,
            y: -20,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        };
    }

    burst(count = 100) {
        if (!this.canvas) return;
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
        if (!this.running) {
            this.running = true;
            this.animate();
        }
    }

    animate() {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.rotation += p.rotationSpeed;
            p.opacity -= 0.003;

            if (p.opacity <= 0 || p.y > this.canvas.height + 50) {
                this.particles.splice(i, 1);
                return;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = p.opacity;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            this.ctx.restore();
        });

        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.running = false;
        }
    }
}

let confetti;

// --- Game Data ---
const gamesList = [
    { id: 'wordmatch', name: 'Word Match', icon: 'fa-puzzle-piece', color: 'bg-purple', desc: 'Match words with meanings' },
    { id: 'grammar', name: 'Grammar Quiz', icon: 'fa-spell-check', color: 'bg-blue', desc: 'Test your grammar skills' },
    { id: 'memory', name: 'Memory Card', icon: 'fa-clone', color: 'bg-pink', desc: 'Match vocabulary pairs' },
    { id: 'fillblank', name: 'Fill in Blank', icon: 'fa-pen', color: 'bg-green', desc: 'Complete the sentences' },
    { id: 'conversation', name: 'Conversation', icon: 'fa-comments', color: 'bg-yellow', desc: 'Build dialogues' },
    { id: 'typing', name: 'Speed Typing', icon: 'fa-keyboard', color: 'bg-orange', desc: 'Type as fast as you can' },
    { id: 'guessword', name: 'Guess Word', icon: 'fa-question-circle', color: 'bg-pink', desc: 'Hangman style game' },
    { id: 'scramble', name: 'Sentence Scramble', icon: 'fa-random', color: 'bg-blue', desc: 'Rearrange words' },
    { id: 'synonym', name: 'Synonym Finder', icon: 'fa-equals', color: 'bg-purple', desc: 'Find similar words' },
    { id: 'antonym', name: 'Antonym Match', icon: 'fa-not-equal', color: 'bg-green', desc: 'Find opposite words' },
    { id: 'verbtense', name: 'Verb Tense', icon: 'fa-clock', color: 'bg-yellow', desc: 'Choose correct tense' },
    { id: 'listening', name: 'Listening Quiz', icon: 'fa-headphones', color: 'bg-orange', desc: 'Listen and answer' },
    { id: 'spelling', name: 'Spelling Bee', icon: 'fa-bee', color: 'bg-pink', desc: 'Spell correctly' },
    { id: 'wordsearch', name: 'Word Search', icon: 'fa-search', color: 'bg-blue', desc: 'Find hidden words' },
    { id: 'crossword', name: 'Crossword', icon: 'fa-th', color: 'bg-purple', desc: 'Solve the puzzle' }
];

const gameData = {
    wordmatch: {
        easy: [
            { en: 'Dragon', id: 'Mythical creature' }, { en: 'Beach', id: 'Sandy place near the sea' },
            { en: 'Holiday', id: 'Time for vacation' }, { en: 'Friendly', id: 'Kind and nice person' },
            { en: 'Mountain', id: 'Very high land' }
        ],
        medium: [
            { en: 'Legend', id: 'Traditional story from the past' }, { en: 'Delicious', id: 'Very tasty food' },
            { en: 'Adventure', id: 'An unusual and exciting experience' }, { en: 'Crowded', id: 'Full of many people' },
            { en: 'Discover', id: 'To find something for the first time' }
        ],
        hard: [
            { en: 'Determined', id: 'Having strong desire to achieve something' }, { en: 'Magnificent', id: 'Extremely beautiful or impressive' },
            { en: 'Unexpected', id: 'Happening without warning' }, { en: 'Abandoned', id: 'Left by people and no longer used' },
            { en: 'SInvestigate', id: 'BerkelanjutTo examine something carefully to find facts' }
        ]
    },
    grammar: {
        easy: [
            { q: 'She ___ to school every morning.', options: ['go', 'goes', 'going', 'gone'], a: 1, exp: '“She” uses verb + s in simple present tense.' },
            { q: 'My family ___ in Bali last holiday.', options: ['stay', 'stayed', 'staying', 'stays'], a: 1, exp: 'Last holiday” shows past tense, so use “stayed.' },
            { q: 'The dragon ___ very strong.', options: ['is', 'are', 'am', 'be'], a: 0, exp: 'Singular subject “dragon” uses “is”.' },
            { q: 'They ___ playing football now.', options: ['is', 'are', 'am', 'be'], a: 1, exp: '“They” uses “are” in present continuous tense.' },
            { q: 'I ___ a beautiful beach yesterday.', options: ['visit', 'visited', 'visiting', 'visits'], a: 1, exp: '“Yesterday” means the action happened in the past.' }
        ],
        medium: [
            { q: 'The students ___ English before the teacher came.', options: ['study', 'studied', 'studies', 'studying'], a: 1, exp: 'The sentence talks about a past activity, so use past tense.' },
            { q: 'My brother ___ watching a movie when I arrived.', options: ['is', 'was', 'were', 'are'], a: 1, exp: 'Singular subject “brother” uses “was” in past continuous tense.' },
            { q: 'The castle ___ by many tourists every year.', options: ['visit', 'visited', 'is visited', 'visiting'], a: 1, exp: 'Passive voice is used because the castle receives the action.' },
            { q: 'She was tired ___ she continued her journey.', options: ['but', 'because', 'and', 'so'], a: 0, exp: '“But” connects two contrasting ideas.' },
            { q: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'stayed', 'will stay', 'staying'], a: 2, exp: 'First conditional uses “will” for future results.' }
        ],
        hard: [
            { q: 'By the time we arrived, the movie ___ already ___.', options: ['has / started', 'had / started', 'have / start', 'was / starting'], a: 1, exp: 'Past perfect is used for an action completed before another past action.' },
            { q: 'The boy, who ___ in the competition, received a gold medal.', options: ['win', 'won', 'winning', 'wins'], a: 1, exp: 'The sentence talks about a completed past event, so use past tense.' },
            { q: 'If she ___ harder, she would pass the exam.', options: ['study', 'studies', 'studied', 'studying'], a: 2, exp: 'Second conditional uses past tense after “if”.' },
            { q: 'The ancient temple ___ carefully by the workers last year.', options: ['restore', 'restored', 'was restored', 'restoring'], a: 2, exp: 'Passive voice is needed because the temple receives the action.' },
            { q: 'Neither the teacher nor the students ___ ready for the trip.', options: ['was', 'were', 'is', 'be'], a: 1, exp: 'The verb follows the nearest subject, “students,” which is plural.' }
        ]
    },
    fillblank: {
        easy: [
            { sentence: 'Cinderella lost her glass [blank] at the party..', answer: 'shoes', hints: ['shoes', 'bag', 'hat'] },
            { sentence: 'My best friend is very [blank] and helpful.', answer: 'kind', hints: ['kind', 'evil'] },
            { sentence: 'Last holiday, my family went to the [blank].', answer: 'beach', hints: ['beach', 'see', 'island'] }
        ],
        medium: [
            { sentence: 'The prince searched the whole kingdom to find the girl who owned the glass [blank].', answer: 'slipper', hints: ['slipper', 'sandals'] },
            { sentence: 'Last weekend, we [blank] camping near the river with our classmates.', answer: 'went', hints: ['went', 'go'] },
            { sentence: 'Borobudur Temple is very [blank] because many tourists visit it every year.', answer: 'famous', hints: ['famous', 'rich'] }
        ],
        hard: [
            { sentence: 'The villagers were very [blank] after hearing the mysterious story from the old man.', options: ['hungry', 'frightened', 'cheerful', 'noisy'], answer: 1 },
            { sentence: 'During our trip to Yogyakarta, we [blank] several historical places and museums.', options: ['visited', 'visiting', 'visits', 'visit'], answer: 0 },
            { sentence: 'The castle looked very [blank] under the moonlight at midnight.', options: ['magnificent', 'tiny', 'weak', 'dirty'], answer: 0 }
        ]
    },
    conversation: {
        easy: [
            {
                scene: 'At the Beach',
                dialogue: [
                    { speaker: 'bot', text: 'Wow, this beach is very beautiful.' },
                    { speaker: 'user', text: '' }
                ],
                options: ['Yes, I really like this place.', 'I am doing homework now.', 'The dragon is sleeping.', 'Yesterday is Monday.'],
                correct: 0,
                followup: [
                    { speaker: 'bot', text: 'What did you do at the beach yesterday?' },
                    { speaker: 'user', text: '' }
                ],
                followupOptions: ['I played volleyball with my friends.', 'The castle is very old.', 'She is reading a book now.', 'My bag is blue and small.'],
                followupCorrect: 0
            }
        ],
        medium: [
            {
                scene: 'You are talking about your holiday at the beach.',
                dialogue: [
                    { speaker: 'bot', text: 'What did you do during your holiday?' }
                ],
                options: [
                    'I played volleyball and swam with my friends.',
                    'The dragon lives in a dark cave.',
                    'My classroom is very clean.',
                    'She is cooking noodles now.'
                ],
                correct: 0
            }
        ],
        hard: [
            {
                scene: 'You are explaining a mysterious story to your teacher.',
                dialogue: [
                    { speaker: 'bot', text: 'Why were the villagers frightened in the story?' }
                ],
                options: [
                    'Because they heard strange noises from the old castle.',
                    'I like eating fried rice every morning.',
                    'The classroom is very comfortable.',
                    'She is buying a new backpack now.'
                ],
                correct: 0
            }
        ]
    },
    typing: {
            easy: [
                'dragon',
                'beach',
                'friend',
                'castle',
                'forest',
                'holiday',
                'rabbit',
                'school',
                'travel',
                'village'
            ],

            medium: [
                'adventure',
                'beautiful',
                'dangerous',
                'waterfall',
                'mountains',
                'vacation',
                'mysterious',
                'historical',
                'discovered',
                'excellent'
            ],

            hard: [
                'magnificent',
                'communication',
                'extraordinary',
                'responsibility',
                'investigation',
                'environmental',
                'unforgettable',
                'civilization',
                'transportation',
                'achievement'
            ]
            },
    guessword: {
        easy: [
            { word: 'dragon', hint: 'A large mythical creature that can fly' },
            { word: 'beach', hint: 'A sandy place near the sea' },
            { word: 'castle', hint: 'A large building where kings and queens live' }
        ],

        medium: [
            { word: 'adventure', hint: 'An exciting and unusual experience' },
            { word: 'waterfall', hint: 'Water falling from a high place' },
            { word: 'vacation', hint: 'A holiday trip for relaxing' }
        ],

        hard: [
            { word: 'magnificent', hint: 'Extremely beautiful or impressive' },
            { word: 'civilization', hint: 'Advanced human society and culture' },
            { word: 'investigation', hint: 'Careful examination to discover facts' }
        ]
    },
    scramble: {
        easy: [
            {
                words: ['The', 'dragon', 'lives', 'in', 'the', 'cave'],
                answer: 'The dragon lives in the cave'
            },
            {
                words: ['We', 'went', 'to', 'the', 'beach', 'yesterday'],
                answer: 'We went to the beach yesterday'
            }
        ],

        medium: [
            {
                words: ['The', 'tourists', 'visited', 'the', 'ancient', 'temple'],
                answer: 'The tourists visited the ancient temple'
            },
            {
                words: ['My', 'best', 'friend', 'is', 'very', 'kind', 'and', 'helpful'],
                answer: 'My best friend is very kind and helpful'
            }
        ],

        hard: [
            {
                words: ['The', 'villagers', 'were', 'frightened', 'by', 'the', 'mysterious', 'sound'],
                answer: 'The villagers were frightened by the mysterious sound'
            },
            {
                words: ['The', 'magnificent', 'castle', 'attracted', 'many', 'foreign', 'tourists'],
                answer: 'The magnificent castle attracted many foreign tourists'
            }
        ]
    },
    synonym: {
        easy: [
            {
                word: 'Brave',
                options: ['Afraid', 'Courageous', 'Weak', 'Lazy'],
                a: 1
            },
            {
                word: 'Beautiful',
                options: ['Ugly', 'Pretty', 'Dirty', 'Small'],
                a: 1
            },
            {
                word: 'Happy',
                options: ['Sad', 'Joyful', 'Angry', 'Tired'],
                a: 1
            }
        ],

        medium: [
            {
                word: 'Ancient',
                options: ['Modern', 'Old', 'Young', 'New'],
                a: 1
            },
            {
                word: 'Famous',
                options: ['Unknown', 'Popular', 'Quiet', 'Hidden'],
                a: 1
            },
            {
                word: 'Dangerous',
                options: ['Safe', 'Risky', 'Friendly', 'Calm'],
                a: 1
            }
        ],

        hard: [
            {
                word: 'Magnificent',
                options: ['Ordinary', 'Impressive', 'Tiny', 'Weak'],
                a: 1
            },
            {
                word: 'Mysterious',
                options: ['Clear', 'Strange', 'Simple', 'Bright'],
                a: 1
            },
            {
                word: 'Determined',
                options: ['Confident', 'Lazy', 'Hopeless', 'Careless'],
                a: 0
            }
        ]
    },
    antonym: {
        easy: [
            {
                word: 'Big',
                options: ['Large', 'Huge', 'Small', 'Tall'],
                a: 2
            },
            {
                word: 'Happy',
                options: ['Sad', 'Joyful', 'Excited', 'Cheerful'],
                a: 0
            },
            {
                word: 'Fast',
                options: ['Quick', 'Rapid', 'Slow', 'Early'],
                a: 2
            }
        ],

        medium: [
            {
                word: 'Beautiful',
                options: ['Pretty', 'Ugly', 'Clean', 'Bright'],
                a: 1
            },
            {
                word: 'Dangerous',
                options: ['Risky', 'Safe', 'Wild', 'Scary'],
                a: 1
            },
            {
                word: 'Ancient',
                options: ['Old', 'Historic', 'Modern', 'Traditional'],
                a: 2
            }
        ],

        hard: [
            {
                word: 'Magnificent',
                options: ['Impressive', 'Ordinary', 'Beautiful', 'Famous'],
                a: 1
            },
            {
                word: 'Mysterious',
                options: ['Strange', 'Unknown', 'Clear', 'Confusing'],
                a: 2
            },
            {
                word: 'Determined',
                options: ['Focused', 'Hopeless', 'Strong', 'Confident'],
                a: 1
            }
        ]
    },
    verbtense: {
        easy: [
            {
                sentence: 'We [blank] to the beach last weekend.',
                options: ['go', 'goes', 'went', 'going'],
                a: 2,
                tense: 'Simple Past'
            },
            {
                sentence: 'She [blank] her homework right now.',
                options: ['do', 'did', 'is doing', 'does'],
                a: 2,
                tense: 'Present Continuous'
            }
        ],

        medium: [
            {
                sentence: 'They [blank] English for three years before moving to Jakarta.',
                options: ['study', 'studied', 'had studied', 'studying'],
                a: 2,
                tense: 'Past Perfect'
            },
            {
                sentence: 'The story [blank] by the teacher yesterday.',
                options: ['told', 'was told', 'tell', 'telling'],
                a: 1,
                tense: 'Simple Past Passive'
            }
        ],

        hard: [
            {
                sentence: 'If I had more time, I [blank] another novel.',
                options: ['will write', 'would write', 'wrote', 'writes'],
                a: 1,
                tense: 'Second Conditional'
            },
            {
                sentence: 'By next year, the students [blank] English for six years.',
                options: ['study', 'will study', 'will have studied', 'studied'],
                a: 2,
                tense: 'Future Perfect'
            }
        ]
    },
    listening: {
        easy: [
            {
                text: 'Last holiday, my family and I went to the beach. We played volleyball, swam in the sea, and watched the sunset together.',
                question: 'What did they do at the beach?',
                options: ['Played volleyball', 'Visited a museum', 'Climbed a mountain', 'Read books'],
                a: 0
            }
        ],

        medium: [
            {
                text: 'The ancient castle on the hill is very famous. Many tourists visit it because of its beautiful architecture and mysterious history.',
                question: 'Why do many tourists visit the castle?',
                options: ['Because it is modern', 'Because of its architecture and history', 'Because it is a school', 'Because it is dangerous'],
                a: 1
            }
        ],

        hard: [
            {
                text: 'During the expedition, the researchers discovered several historical artifacts hidden inside the abandoned temple deep in the forest.',
                question: 'What did the researchers discover?',
                options: ['Modern technology', 'Historical artifacts', 'A new city', 'Rare animals'],
                a: 1
            }
        ]
    },
    spelling: {
        easy: [
            {
                word: 'holiday',
                hint: 'Time for vacation and relaxing',
                syllables: 'hol-i-day'
            },
            {
                word: 'village',
                hint: 'A small town in the countryside',
                syllables: 'vil-lage'
            }
        ],

        medium: [
            {
                word: 'adventure',
                hint: 'An exciting experience',
                syllables: 'ad-ven-ture'
            },
            {
                word: 'waterfall',
                hint: 'Water falling from a high place',
                syllables: 'wa-ter-fall'
            }
        ],

        hard: [
            {
                word: 'magnificent',
                hint: 'Extremely beautiful or impressive',
                syllables: 'mag-nif-i-cent'
            },
            {
                word: 'civilization',
                hint: 'Advanced human society and culture',
                syllables: 'ci-vil-i-za-tion'
            }
        ]
    },
    wordsearch: {
        easy: {
            words: ['TEXT', 'STORY', 'EVENT', 'PLACE', 'PERSON'],
            grid: [
                'T','E','X','T','X','S','T','O','R','Y',
                'X','X','X','X','X','X','X','X','X','X',
                'E','V','E','N','T','X','X','X','X','X',
                'X','X','P','L','A','C','E','X','X','X',
                'X','P','E','R','S','O','N','X','X','X'
            ]
        },

        medium: {
            words: ['RECOUNT', 'DESCRIBE', 'NARRATIVE', 'MEMORY', 'CHARACTER'],
            grid: [
                'R','E','C','O','U','N','T','X','X','X',
                'X','X','X','X','X','X','X','X','X','X',
                'D','E','S','C','R','I','B','E','X','X',
                'X','X','X','X','X','X','X','X','X','X',
                'N','A','R','R','A','T','I','V','E','X',
                'X','M','E','M','O','R','Y','X','X','X',
                'C','H','A','R','A','C','T','E','R','X'
            ]
        },

        hard: {
            words: ['ORIENTATION', 'COMPLICATION', 'RESOLUTION', 'DESCRIPTION', 'EXPERIENCE'],
            grid: [
                'O','R','I','E','N','T','A','T','I','O',
                'X','X','X','X','X','X','X','X','X','N',
                'C','O','M','P','L','I','C','A','T','I',
                'X','X','X','X','X','X','X','X','X','O',
                'R','E','S','O','L','U','T','I','O','N',
                'X','X','X','X','X','X','X','X','X','X',
                'D','E','S','C','R','I','P','T','I','O',
                'X','X','X','X','X','X','X','X','X','N',
                'E','X','P','E','R','I','E','N','C','E',
                'X','X','X','X','X','X','X','X','X','X'
            ]
        }
    },
    crossword: {
        easy: {
            words: [
                { word: 'TEXT', clue: 'A type of writing', row: 0, col: 0, dir: 'across', num: 1 },
                { word: 'STORY', clue: 'A narrative tells this', row: 0, col: 0, dir: 'down', num: 1 },
                { word: 'EVENT', clue: 'Something that happened in recount text', row: 0, col: 3, dir: 'down', num: 2 }
            ]
        },

        medium: {
            words: [
                { word: 'RECOUNT', clue: 'Text about past experiences', row: 0, col: 0, dir: 'across', num: 1 },
                { word: 'DETAIL', clue: 'Important part in descriptive text', row: 0, col: 2, dir: 'down', num: 2 },
                { word: 'SETTING', clue: 'Place and time in narrative text', row: 2, col: 0, dir: 'across', num: 3 },
                { word: 'PERSON', clue: 'Someone described in descriptive text', row: 1, col: 5, dir: 'down', num: 4 }
            ]
        },

        hard: {
            words: [
                { word: 'NARRATIVE', clue: 'Text with conflict and resolution', row: 0, col: 0, dir: 'across', num: 1 },
                { word: 'DESCRIPTION', clue: 'Explaining details clearly', row: 0, col: 3, dir: 'down', num: 2 },
                { word: 'ORIENTATION', clue: 'Opening part of a text', row: 3, col: 0, dir: 'across', num: 3 },
                { word: 'RESOLUTION', clue: 'Ending of the conflict', row: 5, col: 2, dir: 'down', num: 4 }
            ]
        }
    }
};

// --- Utility Functions ---
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function saveToLocal(key, data) {
    localStorage.setItem('questify_' + key, JSON.stringify(data));
}

function loadFromLocal(key, fallback) {
    const val = localStorage.getItem('questify_' + key);
    return val ? JSON.parse(val) : fallback;
}

function getLeaderboard(level) {
    return loadFromLocal('leaderboard_' + level, [
        { name: 'Player 1', score: 500 },
        { name: 'Player 2', score: 350 },
        { name: 'Player 3', score: 200 }
    ]);
}

function saveLeaderboard(level, score) {
    const lb = getLeaderboard(level);
    const playerName = 'You';
    const existing = lb.find(p => p.name === playerName);
    if (existing) {
        if (score > existing.score) existing.score = score;
    } else {
        lb.push({ name: playerName, score });
    }
    lb.sort((a, b) => b.score - a.score);
    saveToLocal('leaderboard_' + level, lb.slice(0, 10));
}

function getGameProgress() {
    return loadFromLocal('progress', {});
}

function saveGameProgress(gameId, level, percent) {
    const p = getGameProgress();
    if (!p[gameId]) p[gameId] = {};
    const prev = p[gameId][level] || 0;
    if (percent > prev) p[gameId][level] = percent;
    saveToLocal('progress', p);
}

function getOverallProgress() {
    const p = getGameProgress();
    let total = 0, count = 0;
    gamesList.forEach(g => {
        ['easy', 'medium', 'hard'].forEach(l => {
            total += p[g.id]?.[l] || 0;
            count++;
        });
    });
    return count ? Math.round(total / count) : 0;
}

function startTimer(seconds, onTick, onEnd) {
    state.timeLeft = seconds;
    const timerEl = document.getElementById('arena-timer');
    if (timerEl) timerEl.textContent = seconds;

    state.timer = setInterval(() => {
        state.timeLeft--;
        if (timerEl) timerEl.textContent = state.timeLeft;
        if (onTick) onTick(state.timeLeft);
        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            if (onEnd) onEnd();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timer) clearInterval(state.timer);
}

// ========================================
// GAME IMPLEMENTATIONS
// ========================================

// --- Word Match ---
function initWordMatch() {
    const data = gameData.wordmatch[state.currentLevel];
    const pairs = shuffle(data).slice(0, 5);
    const enCards = shuffle(pairs.map(p => ({ text: p.en, match: p.id, type: 'en' })));
    const idCards = shuffle(pairs.map(p => ({ text: p.id, match: p.en, type: 'id' })));

    state.gameData = { pairs, enCards, idCards, selected: null, matched: 0 };
    state.totalQuestions = pairs.length;
    state.correctCount = 0;
    state.currentQuestion = 0;

    const arena = document.getElementById('arena-content');
    arena.innerHTML = '<div class="word-match-grid" id="wordmatch-grid"></div>';
    const grid = document.getElementById('wordmatch-grid');

    const allCards = shuffle([...enCards, ...idCards]);
    allCards.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'match-card';
        div.textContent = card.text;
        div.dataset.match = card.match;
        div.dataset.index = i;
        div.onclick = () => handleMatchClick(i, div);
        grid.appendChild(div);
    });
}

function handleMatchClick(index, el) {
    if (el.classList.contains('matched') || el.classList.contains('selected')) return;
    playSound('click');

    const data = state.gameData;
    if (!data.selected) {
        data.selected = { index, el, match: el.dataset.match };
        el.classList.add('selected');
    } else {
        const prev = data.selected;
        if (prev.index === index) {
            el.classList.remove('selected');
            data.selected = null;
            return;
        }

        if (prev.match === el.textContent || el.dataset.match === prev.el.textContent) {
            prev.el.classList.add('correct', 'matched');
            el.classList.add('correct', 'matched');
            prev.el.classList.remove('selected');
            data.matched++;
            state.correctCount++;
            state.score += 20;
            updateScore();
            playSound('correct');
            data.selected = null;

            if (data.matched >= state.totalQuestions) {
                setTimeout(() => showResult(), 800);
            }
        } else {
            prev.el.classList.add('wrong');
            el.classList.add('wrong');
            prev.el.classList.remove('selected');
            playSound('wrong');
            data.selected = null;
            setTimeout(() => {
                prev.el.classList.remove('wrong');
                el.classList.remove('wrong');
            }, 600);
        }
    }
}

// --- Grammar Quiz ---
function initGrammarQuiz() {
    const data = gameData.grammar[state.currentLevel];
    state.gameData = { questions: shuffle(data), current: 0 };
    state.totalQuestions = data.length;
    state.correctCount = 0;
    state.currentQuestion = 0;
    renderGrammarQuestion();
}

function renderGrammarQuestion() {
    const data = state.gameData;
    const q = data.questions[data.current];
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-question">${q.q}</div>
            <div class="quiz-options" id="grammar-options"></div>
            <div id="grammar-feedback"></div>
            <div style="text-align:center;margin-top:20px;color:var(--text-secondary);font-size:14px;">
                Question ${data.current + 1} of ${state.totalQuestions}
            </div>
        </div>
    `;

    const opts = document.getElementById('grammar-options');
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.onclick = () => handleGrammarAnswer(i, btn);
        opts.appendChild(btn);
    });
}

function handleGrammarAnswer(index, btn) {
    const data = state.gameData;
    const q = data.questions[data.current];
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach(o => o.classList.add('disabled'));

    const feedback = document.getElementById('grammar-feedback');

    if (index === q.a) {
        btn.classList.add('correct');
        state.correctCount++;
        state.score += 20;
        updateScore();
        playSound('correct');
        feedback.className = 'quiz-feedback correct';
        feedback.innerHTML = `<i class="fas fa-check-circle"></i> Benar! ${q.exp}`;
    } else {
        btn.classList.add('wrong');
        opts[q.a].classList.add('correct');
        playSound('wrong');
        feedback.className = 'quiz-feedback wrong';
        feedback.innerHTML = `<i class="fas fa-times-circle"></i> Salah! ${q.exp}`;
    }

    setTimeout(() => {
        data.current++;
        if (data.current >= state.totalQuestions) {
            showResult();
        } else {
            renderGrammarQuestion();
        }
    }, 1800);
}

// --- Memory Card ---
function initMemoryCard() {
    const sets = {
        easy: [
            ['Recount','Pengalaman'],
            ['Story','Cerita'],
            ['Place','Tempat'],
            ['Person','Orang'],
            ['Event','Kejadian'],
            ['Text','Teks']
        ],

        medium: [
            ['Narrative','Naratif'],
            ['Describe','Menjelaskan'],
            ['Character','Karakter'],
            ['Setting','Latar'],
            ['Conflict','Konflik'],
            ['Memory','Kenangan']
        ],

        hard: [
            ['Orientation','Pembukaan'],
            ['Resolution','Penyelesaian'],
            ['Complication','Masalah'],
            ['Description','Deskripsi'],
            ['Experience','Pengalaman'],
            ['Conclusion','Penutup']
        ]
    };
    const set = shuffle(sets[state.currentLevel]).slice(0, 6);
    const cards = shuffle(set.flatMap(([en, id]) => [
        { text: en, pair: id }, { text: id, pair: en }
    ]));

    state.gameData = { cards, flipped: [], matched: 0, lock: false };
    state.totalQuestions = set.length;
    state.correctCount = 0;

    const arena = document.getElementById('arena-content');
    arena.innerHTML = '<div class="memory-grid" id="memory-grid"></div>';
    const grid = document.getElementById('memory-grid');

    cards.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'memory-card';
        div.dataset.index = i;
        div.innerHTML = `
            <div class="memory-card-front"><i class="fas fa-question"></i></div>
            <div class="memory-card-back">${card.text}</div>
        `;
        div.onclick = () => handleMemoryClick(i, div);
        grid.appendChild(div);
    });
}

function handleMemoryClick(index, el) {
    const data = state.gameData;
    if (data.lock || el.classList.contains('flipped') || el.classList.contains('matched')) return;
    playSound('click');

    el.classList.add('flipped');
    data.flipped.push({ index, el, text: data.cards[index].text, pair: data.cards[index].pair });

    if (data.flipped.length === 2) {
        data.lock = true;
        const [a, b] = data.flipped;

        if (a.pair === b.text && b.pair === a.text) {
            setTimeout(() => {
                a.el.classList.add('matched');
                b.el.classList.add('matched');
                data.matched++;
                state.correctCount++;
                state.score += 20;
                updateScore();
                playSound('correct');
                data.flipped = [];
                data.lock = false;

                if (data.matched >= state.totalQuestions) {
                    setTimeout(() => showResult(), 600);
                }
            }, 600);
        } else {
            setTimeout(() => {
                a.el.classList.remove('flipped');
                b.el.classList.remove('flipped');
                playSound('wrong');
                data.flipped = [];
                data.lock = false;
            }, 1000);
        }
    }
}

// --- Fill in the Blank ---
function initFillBlank() {
    const levelData = gameData.fillblank[state.currentLevel];
    const questions = shuffle(levelData);
    state.gameData = { questions, current: 0 };
    state.totalQuestions = questions.length;
    state.correctCount = 0;
    renderFillBlank();
}

function renderFillBlank() {
    const data = state.gameData;
    const q = data.questions[data.current];
    const arena = document.getElementById('arena-content');

    let sentenceHtml = q.sentence;
    if (state.currentLevel === 'hard') {
        sentenceHtml = q.sentence.replace('[blank]', `<select id="fill-select" class="fill-input">
            ${q.options.map((opt, i) => `<option value="${i}">${opt}</option>`).join('')}
        </select>`);
    } else {
        sentenceHtml = q.sentence.replace('[blank]', `<input type="text" id="fill-input" class="fill-input" placeholder="Type here...">`);
    }

    arena.innerHTML = `
        <div class="fill-blank-container">
            <div class="fill-sentence">${sentenceHtml}</div>
            <div class="fill-hints" id="fill-hints"></div>
            <button class="btn btn-primary scramble-check-btn" id="fill-check" onclick="checkFillBlank()">
                <i class="fas fa-check"></i> Check Answer
            </button>
            <div style="text-align:center;margin-top:12px;color:var(--text-secondary);font-size:14px;">
                Question ${data.current + 1} of ${state.totalQuestions}
            </div>
        </div>
    `;

    if (state.currentLevel !== 'hard' && q.hints) {
        const hints = document.getElementById('fill-hints');
        q.hints.forEach(h => {
            const span = document.createElement('span');
            span.className = 'fill-hint';
            span.textContent = h;
            hints.appendChild(span);
        });
    }

    if (state.currentLevel !== 'hard') {
        const input = document.getElementById('fill-input');
        input.focus();
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') checkFillBlank();
        });
    }
}

function checkFillBlank() {
    const data = state.gameData;
    const q = data.questions[data.current];
    let userAns;

    if (state.currentLevel === 'hard') {
        userAns = document.getElementById('fill-select').value;
        const isCorrect = parseInt(userAns) === q.answer;
        document.getElementById('fill-select').classList.add(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) {
            state.correctCount++;
            state.score += 20;
            playSound('correct');
        } else {
            playSound('wrong');
        }
    } else {
        userAns = document.getElementById('fill-input').value.trim().toLowerCase();
        const input = document.getElementById('fill-input');
        if (userAns === q.answer.toLowerCase()) {
            input.classList.add('correct');
            state.correctCount++;
            state.score += 20;
            playSound('correct');
        } else {
            input.classList.add('wrong');
            playSound('wrong');
            input.value = q.answer;
        }
    }

    updateScore();
    document.getElementById('fill-check').disabled = true;

    setTimeout(() => {
        data.current++;
        if (data.current >= state.totalQuestions) {
            showResult();
        } else {
            renderFillBlank();
        }
    }, 1500);
}

// --- Conversation Builder ---
function initConversation() {
    const data = gameData.conversation[state.currentLevel];
    const convo = data[0];
    state.gameData = { convo, stage: 0 };
    state.totalQuestions = convo.followup ? 2 : 1;
    state.correctCount = 0;
    renderConversation();
}

function renderConversation() {
    const data = state.gameData;
    const convo = data.convo;
    const arena = document.getElementById('arena-content');

    const stage = data.stage;
    const dialogue = stage === 0 ? convo.dialogue : convo.followup;
    const options = stage === 0 ? convo.options : convo.followupOptions;
    const correct = stage === 0 ? convo.correct : convo.followupCorrect;

    let dialogueHtml = '';
    if (dialogue) {
        dialogue.forEach(d => {
            dialogueHtml += `<div class="convo-bubble ${d.speaker}">${d.text}</div>`;
        });
    }

    arena.innerHTML = `
        <div class="convo-container">
            <div class="convo-scene"><i class="fas fa-map-marker-alt"></i> ${convo.scene}</div>
            <div class="convo-dialogue">${dialogueHtml}</div>
            <div class="convo-options" id="convo-options"></div>
        </div>
    `;

    const opts = document.getElementById('convo-options');
    options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'convo-option';
        btn.textContent = opt;
        btn.onclick = () => handleConvoAnswer(i, correct, btn);
        opts.appendChild(btn);
    });
}

function handleConvoAnswer(index, correct, btn) {
    const opts = document.querySelectorAll('.convo-option');
    opts.forEach(o => o.disabled = true);

    if (index === correct) {
        btn.classList.add('correct');
        state.correctCount++;
        state.score += 20;
        updateScore();
        playSound('correct');
    } else {
        btn.classList.add('wrong');
        opts[correct].classList.add('correct');
        playSound('wrong');
    }

    setTimeout(() => {
        if (state.gameData.stage === 0 && state.gameData.convo.followup) {
            state.gameData.stage = 1;
            renderConversation();
        } else {
            showResult();
        }
    }, 1500);
}

// --- Speed Typing ---
function initSpeedTyping() {
    const words = shuffle(gameData.typing[state.currentLevel]);
    state.gameData = { words, current: 0, startTime: null, typedCount: 0 };
    state.totalQuestions = words.length;
    state.correctCount = 0;
    state.timeLeft = 60;
    renderTyping();

    startTimer(60, (t) => {
        if (t <= 10) playSound('tick');
    }, () => {
        showResult();
    });
}

function renderTyping() {
    const data = state.gameData;
    const word = data.words[data.current];
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="typing-container">
            <div class="typing-word" id="typing-word">${word.split('').map(c => `<span class="pending-char">${c}</span>`).join('')}</div>
            <input type="text" class="typing-input" id="typing-input" placeholder="Type the word..." autocomplete="off" spellcheck="false">
            <div class="typing-stats-row">
                <div class="typing-stat-box">
                    <div class="typing-stat-label">WPM</div>
                    <div class="typing-stat-value" id="typing-wpm">0</div>
                </div>
                <div class="typing-stat-box">
                    <div class="typing-stat-label">Correct</div>
                    <div class="typing-stat-value" id="typing-correct">0</div>
                </div>
            </div>
        </div>
    `;

    const input = document.getElementById('typing-input');
    input.focus();

    input.addEventListener('input', () => {
        if (!data.startTime) data.startTime = Date.now();
        const val = input.value;
        const chars = document.querySelectorAll('#typing-word span');

        let allCorrect = true;
        chars.forEach((span, i) => {
            if (i < val.length) {
                if (val[i] === word[i]) {
                    span.className = 'correct-char';
                } else {
                    span.className = 'wrong-char';
                    allCorrect = false;
                }
            } else {
                span.className = 'pending-char';
                allCorrect = false;
            }
            if (i === val.length) span.className = 'current-char';
        });

        if (val === word) {
            state.correctCount++;
            state.score += 15;
            data.typedCount++;
            updateScore();
            playSound('correct');

            const elapsed = (Date.now() - data.startTime) / 1000 / 60;
            const wpm = elapsed > 0 ? Math.round(data.typedCount / elapsed) : 0;
            document.getElementById('typing-wpm').textContent = wpm;
            document.getElementById('typing-correct').textContent = state.correctCount;

            data.current++;
            if (data.current >= state.totalQuestions) {
                showResult();
            } else {
                renderTyping();
            }
        }
    });
}

// --- Guess the Word ---
function initGuessWord() {
    const data = shuffle(gameData.guessword[state.currentLevel])[0];
    const word = data.word.toUpperCase();
    state.gameData = { word, hint: data.hint, guessed: [], wrong: 0, maxWrong: 6, revealed: Array(word.length).fill(false) };
    state.totalQuestions = 1;
    state.correctCount = 0;
    renderGuessWord();
}

function renderGuessWord() {
    const data = state.gameData;
    const arena = document.getElementById('arena-content');

    let displayHtml = '';
    data.revealed.forEach((rev, i) => {
        displayHtml += `<div class="guess-letter ${rev ? 'revealed' : ''}">${rev ? data.word[i] : ''}</div>`;
    });

    const hearts = [];
    for (let i = 0; i < data.maxWrong; i++) {
        hearts.push(i < data.wrong ? '<i class="fas fa-heart-broken"></i>' : '<i class="fas fa-heart"></i>');
    }

    arena.innerHTML = `
        <div class="guess-container">
            <div class="guess-hint"><i class="fas fa-lightbulb"></i> ${data.hint}</div>
            <div class="guess-word-display">${displayHtml}</div>
            <div class="guess-keyboard" id="guess-keyboard"></div>
            <div class="guess-attempts">${hearts.join(' ')}</div>
        </div>
    `;

    const kb = document.getElementById('guess-keyboard');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    letters.forEach(l => {
        const btn = document.createElement('button');
        btn.className = 'guess-key';
        btn.textContent = l;
        if (data.guessed.includes(l)) btn.classList.add('used');
        if (data.word.includes(l) && data.guessed.includes(l)) btn.classList.add('correct');
        else if (!data.word.includes(l) && data.guessed.includes(l)) btn.classList.add('wrong');
        btn.onclick = () => handleGuessLetter(l, btn);
        kb.appendChild(btn);
    });
}

function handleGuessLetter(letter, btn) {
    const data = state.gameData;
    if (data.guessed.includes(letter)) return;
    data.guessed.push(letter);
    playSound('click');

    if (data.word.includes(letter)) {
        btn.classList.add('correct');
        playSound('correct');
        data.word.split('').forEach((c, i) => {
            if (c === letter) data.revealed[i] = true;
        });

        if (data.revealed.every(r => r)) {
            state.correctCount = 1;
            state.score += 50;
            updateScore();
            setTimeout(() => showResult(), 500);
        }
    } else {
        btn.classList.add('wrong');
        data.wrong++;
        playSound('wrong');

        if (data.wrong >= data.maxWrong) {
            setTimeout(() => showResult(), 500);
        }
    }

    renderGuessWord();
}

// --- Sentence Scramble ---
function initSentenceScramble() {
    const data = shuffle(gameData.scramble[state.currentLevel])[0];
    const words = shuffle(data.words);
    state.gameData = { words, answer: data.answer, placed: [] };
    state.totalQuestions = 1;
    state.correctCount = 0;
    renderScramble();
}

function renderScramble() {
    const data = state.gameData;
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="scramble-container">
            <div class="scramble-hint">Arrange the words to form a correct sentence:</div>
            <div class="scramble-drop-zone" id="scramble-zone"></div>
            <div class="scramble-word-bank" id="scramble-bank"></div>
            <button class="btn btn-primary scramble-check-btn" id="scramble-check" onclick="checkScramble()">
                <i class="fas fa-check"></i> Check
            </button>
        </div>
    `;

    const bank = document.getElementById('scramble-bank');
    data.words.forEach((w, i) => {
        const span = document.createElement('span');
        span.className = 'scramble-word';
        span.textContent = w;
        span.dataset.word = w;
        span.dataset.index = i;
        span.onclick = () => toggleScrambleWord(span);
        bank.appendChild(span);
    });
}

function toggleScrambleWord(el) {
    const data = state.gameData;
    const zone = document.getElementById('scramble-zone');
    const bank = document.getElementById('scramble-bank');
    playSound('click');

    if (el.parentElement === zone) {
        bank.appendChild(el);
        el.classList.remove('in-zone');
    } else {
        zone.appendChild(el);
        el.classList.add('in-zone');
    }
}

function checkScramble() {
    const data = state.gameData;
    const zone = document.getElementById('scramble-zone');
    const placed = Array.from(zone.children).map(c => c.dataset.word);
    const userAnswer = placed.join(' ');
    const zoneEl = document.getElementById('scramble-zone');

    if (userAnswer === data.answer) {
        zoneEl.style.borderColor = 'var(--green)';
        zoneEl.style.background = 'rgba(0, 255, 157, 0.1)';
        state.correctCount = 1;
        state.score += 50;
        updateScore();
        playSound('correct');
        setTimeout(() => showResult(), 1000);
    } else {
        zoneEl.style.borderColor = 'var(--error)';
        zoneEl.style.background = 'rgba(255, 42, 42, 0.1)';
        playSound('wrong');
        setTimeout(() => {
            zoneEl.style.borderColor = '';
            zoneEl.style.background = '';
        }, 1000);
    }
}

// --- Synonym Finder ---
function initSynonym() {
    const data = shuffle(gameData.synonym[state.currentLevel]);
    state.gameData = { questions: data, current: 0 };
    state.totalQuestions = data.length;
    state.correctCount = 0;
    renderSynonym();
}

function renderSynonym() {
    const data = state.gameData;
    const q = data.questions[data.current];
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="match-pair-container">
            <div class="match-pair-question">Find the synonym for: <span class="target-word">${q.word}</span></div>
            <div class="match-pair-options" id="synonym-options"></div>
            <div style="text-align:center;margin-top:16px;color:var(--text-secondary);font-size:14px;">
                Question ${data.current + 1} of ${state.totalQuestions}
            </div>
        </div>
    `;

    const opts = document.getElementById('synonym-options');
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'match-pair-btn';
        btn.textContent = opt;
        btn.onclick = () => handleSynonymAnswer(i, q.a, btn);
        opts.appendChild(btn);
    });
}

function handleSynonymAnswer(index, correct, btn) {
    const opts = document.querySelectorAll('.match-pair-btn');
    opts.forEach(o => o.disabled = true);

    if (index === correct) {
        btn.classList.add('correct');
        state.correctCount++;
        state.score += 20;
        updateScore();
        playSound('correct');
    } else {
        btn.classList.add('wrong');
        opts[correct].classList.add('correct');
        playSound('wrong');
    }

    setTimeout(() => {
        state.gameData.current++;
        if (state.gameData.current >= state.totalQuestions) {
            showResult();
        } else {
            renderSynonym();
        }
    }, 1200);
}

// --- Antonym Match ---
function initAntonym() {
    const data = shuffle(gameData.antonym[state.currentLevel]);
    state.gameData = { questions: data, current: 0 };
    state.totalQuestions = data.length;
    state.correctCount = 0;
    renderAntonym();
}

function renderAntonym() {
    const data = state.gameData;
    const q = data.questions[data.current];
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="match-pair-container">
            <div class="match-pair-question">Find the antonym for: <span class="target-word">${q.word}</span></div>
            <div class="match-pair-options" id="antonym-options"></div>
            <div style="text-align:center;margin-top:16px;color:var(--text-secondary);font-size:14px;">
                Question ${data.current + 1} of ${state.totalQuestions}
            </div>
        </div>
    `;

    const opts = document.getElementById('antonym-options');
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'match-pair-btn';
        btn.textContent = opt;
        btn.onclick = () => handleAntonymAnswer(i, q.a, btn);
        opts.appendChild(btn);
    });
}

function handleAntonymAnswer(index, correct, btn) {
    const opts = document.querySelectorAll('.match-pair-btn');
    opts.forEach(o => o.disabled = true);

    if (index === correct) {
        btn.classList.add('correct');
        state.correctCount++;
        state.score += 20;
        updateScore();
        playSound('correct');
    } else {
        btn.classList.add('wrong');
        opts[correct].classList.add('correct');
        playSound('wrong');
    }

    setTimeout(() => {
        state.gameData.current++;
        if (state.gameData.current >= state.totalQuestions) {
            showResult();
        } else {
            renderAntonym();
        }
    }, 1200);
}

// --- Verb Tense ---
function initVerbTense() {
    const data = shuffle(gameData.verbtense[state.currentLevel]);
    state.gameData = { questions: data, current: 0 };
    state.totalQuestions = data.length;
    state.correctCount = 0;
    renderVerbTense();
}

function renderVerbTense() {
    const data = state.gameData;
    const q = data.questions[data.current];
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="verb-container">
            <div class="verb-sentence">${q.sentence.replace('[blank]', `<span class="verb-blank">?</span>`)}</div>
            <div style="text-align:center;color:var(--purple);font-size:13px;margin-bottom:16px;">${q.tense}</div>
            <div class="verb-options" id="verb-options"></div>
            <div style="text-align:center;margin-top:16px;color:var(--text-secondary);font-size:14px;">
                Question ${data.current + 1} of ${state.totalQuestions}
            </div>
        </div>
    `;

    const opts = document.getElementById('verb-options');
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'verb-option';
        btn.textContent = opt;
        btn.onclick = () => handleVerbAnswer(i, q.a, btn);
        opts.appendChild(btn);
    });
}

function handleVerbAnswer(index, correct, btn) {
    const opts = document.querySelectorAll('.verb-option');
    opts.forEach(o => o.disabled = true);

    if (index === correct) {
        btn.classList.add('correct');
        state.correctCount++;
        state.score += 20;
        updateScore();
        playSound('correct');
    } else {
        btn.classList.add('wrong');
        opts[correct].classList.add('correct');
        playSound('wrong');
    }

    setTimeout(() => {
        state.gameData.current++;
        if (state.gameData.current >= state.totalQuestions) {
            showResult();
        } else {
            renderVerbTense();
        }
    }, 1200);
}

// --- Listening Quiz ---
function initListening() {
    const data = shuffle(gameData.listening[state.currentLevel]);
    state.gameData = { questions: data, current: 0, playing: false };
    state.totalQuestions = data.length;
    state.correctCount = 0;
    renderListening();
}

function renderListening() {
    const data = state.gameData;
    const q = data.questions[data.current];
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="listening-container">
            <div class="listening-player" id="listen-player" onclick="playListeningAudio()">
                <i class="fas fa-play" id="listen-icon"></i>
            </div>
            <div class="listening-text" id="listen-text" style="opacity:0;transition:opacity 0.5s;"></div>
            <div class="quiz-options" id="listen-options"></div>
            <div style="text-align:center;margin-top:16px;color:var(--text-secondary);font-size:14px;">
                Question ${data.current + 1} of ${state.totalQuestions}
            </div>
        </div>
    `;

    const opts = document.getElementById('listen-options');
    opts.style.display = 'none';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.style.display = 'none';
        btn.onclick = () => handleListenAnswer(i, q.a, btn);
        opts.appendChild(btn);
    });
}

function playListeningAudio() {
    const data = state.gameData;
    const q = data.questions[data.current];
    const player = document.getElementById('listen-player');
    const icon = document.getElementById('listen-icon');
    const text = document.getElementById('listen-text');
    const opts = document.querySelectorAll('#listen-options .quiz-option');

    if (data.playing) return;
    data.playing = true;

    player.classList.add('playing');
    icon.className = 'fas fa-volume-up';

    // Simulate audio with speech synthesis if available
    if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(q.text);
        utter.lang = 'en-US';
        utter.rate = 0.9;
        utter.onend = () => {
            finishListening();
        };
        speechSynthesis.speak(utter);
    } else {
        // Show text as "transcript" after delay
        setTimeout(() => {
            text.textContent = '"' + q.text + '"';
            text.style.opacity = 1;
            finishListening();
        }, 2000);
    }
}

function finishListening() {
    const data = state.gameData;
    const player = document.getElementById('listen-player');
    const icon = document.getElementById('listen-icon');
    const opts = document.querySelectorAll('#listen-options .quiz-option');

    player.classList.remove('playing');
    icon.className = 'fas fa-play';
    data.playing = false;

    document.getElementById('listen-options').style.display = 'flex';
    opts.forEach(o => o.style.display = 'block');
}

function handleListenAnswer(index, correct, btn) {
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach(o => o.classList.add('disabled'));

    if (index === correct) {
        btn.classList.add('correct');
        state.correctCount++;
        state.score += 20;
        updateScore();
        playSound('correct');
    } else {
        btn.classList.add('wrong');
        opts[correct].classList.add('correct');
        playSound('wrong');
    }

    setTimeout(() => {
        state.gameData.current++;
        if (state.gameData.current >= state.totalQuestions) {
            showResult();
        } else {
            renderListening();
        }
    }, 1500);
}

// --- Spelling Bee ---
function initSpelling() {
    const data = shuffle(gameData.spelling[state.currentLevel])[0];
    state.gameData = { word: data.word, hint: data.hint, syllables: data.syllables };
    state.totalQuestions = 1;
    state.correctCount = 0;
    renderSpelling();
}

function renderSpelling() {
    const data = state.gameData;
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div class="spelling-container">
            <div class="spelling-hint"><i class="fas fa-lightbulb"></i> ${data.hint}</div>
            <button class="spelling-audio-btn" id="spell-audio" onclick="playSpellingAudio()">
                <i class="fas fa-volume-up"></i>
            </button>
            <div class="spelling-hint">Syllables: ${data.syllables}</div>
            <input type="text" class="spelling-input" id="spelling-input" placeholder="Spell the word...">
            <button class="btn btn-primary" style="margin-top:20px;" onclick="checkSpelling()">
                <i class="fas fa-check"></i> Check
            </button>
        </div>
    `;

    const input = document.getElementById('spelling-input');
    input.focus();
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') checkSpelling();
    });
}

function playSpellingAudio() {
    const data = state.gameData;
    if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(data.word);
        utter.lang = 'en-US';
        utter.rate = 0.8;
        speechSynthesis.speak(utter);
    }
    playSound('click');
}

function checkSpelling() {
    const data = state.gameData;
    const input = document.getElementById('spelling-input');
    const val = input.value.trim().toLowerCase();

    if (val === data.word.toLowerCase()) {
        input.classList.add('correct');
        state.correctCount = 1;
        state.score += 50;
        updateScore();
        playSound('correct');
        setTimeout(() => showResult(), 1000);
    } else {
        input.classList.add('wrong');
        playSound('wrong');
        input.value = data.word;
        setTimeout(() => showResult(), 1500);
    }
}

// --- Word Search ---
function initWordSearch() {
    const data = gameData.wordsearch[state.currentLevel];
    state.gameData = { 
        words: [...data.words], 
        found: [],
        grid: data.grid,
        selecting: false,
        selectedCells: []
    };
    state.totalQuestions = data.words.length;
    state.correctCount = 0;
    renderWordSearch();
}

function renderWordSearch() {
    const data = state.gameData;
    const arena = document.getElementById('arena-content');

    arena.innerHTML = `
        <div style="text-align:center;margin-bottom:12px;">
            <div class="ws-words" id="ws-words"></div>
        </div>
        <div class="wordsearch-grid" id="ws-grid"></div>
    `;

    const grid = document.getElementById('ws-grid');
    data.grid.forEach((char, i) => {
        const cell = document.createElement('div');
        cell.className = 'ws-cell';
        cell.textContent = char === 'X' ? String.fromCharCode(65 + Math.floor(Math.random() * 26)) : char;
        cell.dataset.index = i;
        cell.onmousedown = () => startWsSelect(i, cell);
        cell.onmouseenter = () => wsHover(i, cell);
        cell.onmouseup = () => endWsSelect();
        grid.appendChild(cell);
    });

    const wordsEl = document.getElementById('ws-words');
    data.words.forEach(w => {
        const span = document.createElement('span');
        span.className = 'ws-word' + (data.found.includes(w) ? ' found' : '');
        span.textContent = w;
        wordsEl.appendChild(span);
    });
}

function startWsSelect(index, cell) {
    state.gameData.selecting = true;
    state.gameData.selectedCells = [index];
    cell.classList.add('selected');
}

function wsHover(index, cell) {
    const data = state.gameData;
    if (!data.selecting) return;
    if (!data.selectedCells.includes(index)) {
        data.selectedCells.push(index);
        cell.classList.add('selected');
    }
}

function endWsSelect() {
    const data = state.gameData;
    data.selecting = false;

    const selectedWord = data.selectedCells.map(i => data.grid[i]).join('');
    const reverseWord = data.selectedCells.map(i => data.grid[i]).reverse().join('');

    let found = false;
    data.words.forEach(w => {
        if ((selectedWord === w || reverseWord === w) && !data.found.includes(w)) {
            data.found.push(w);
            found = true;
        }
    });

    const cells = document.querySelectorAll('.ws-cell');
    if (found) {
        data.selectedCells.forEach(i => {
            cells[i].classList.remove('selected');
            cells[i].classList.add('found');
        });
        state.correctCount++;
        state.score += 15;
        updateScore();
        playSound('correct');
        renderWordSearch();

        if (data.found.length >= data.words.length) {
            setTimeout(() => showResult(), 800);
        }
    } else {
        data.selectedCells.forEach(i => cells[i].classList.remove('selected'));
    }

    data.selectedCells = [];
}

// --- Crossword ---
function initCrossword() {
    const data = gameData.crossword[state.currentLevel];
    state.gameData = { words: data.words, solved: [] };
    state.totalQuestions = data.words.length;
    state.correctCount = 0;
    renderCrossword();
}

function renderCrossword() {
    const data = state.gameData;
    const arena = document.getElementById('arena-content');

    // Build grid
    const size = state.currentLevel === 'easy' ? 4 : (state.currentLevel === 'medium' ? 5 : 6);
    const grid = Array(size).fill(null).map(() => Array(size).fill(null));

    data.words.forEach(w => {
        const chars = w.word.split('');
        if (w.dir === 'across') {
            chars.forEach((c, i) => {
                if (grid[w.row] && grid[w.row][w.col + i] !== undefined) {
                    grid[w.row][w.col + i] = { char: c, num: i === 0 ? w.num : null };
                }
            });
        } else {
            chars.forEach((c, i) => {
                if (grid[w.row + i] && grid[w.row + i][w.col] !== undefined) {
                    grid[w.row + i][w.col] = { char: c, num: i === 0 ? w.num : null };
                }
            });
        }
    });

    arena.innerHTML = `
        <div class="crossword-container">
            <div class="crossword-grid" id="cw-grid"></div>
            <div class="cw-clues">
                <h4><i class="fas fa-list"></i> Clues</h4>
                <ul class="cw-clue-list" id="cw-clues"></ul>
                <button class="btn btn-primary" style="margin-top:16px;width:100%;" onclick="checkCrossword()">
                    <i class="fas fa-check"></i> Check Answers
                </button>
            </div>
        </div>
    `;

    const gridEl = document.getElementById('cw-grid');
    gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    grid.forEach((row, ri) => {
        row.forEach((cell, ci) => {
            const div = document.createElement('div');
            div.className = 'cw-cell' + (cell ? '' : ' blocked');
            if (cell) {
                div.innerHTML = `
                    ${cell.num ? `<span class="cw-number">${cell.num}</span>` : ''}
                    <input type="text" maxlength="1" data-row="${ri}" data-col="${ci}" data-ans="${cell.char}">
                `;
            }
            gridEl.appendChild(div);
        });
    });

    const cluesEl = document.getElementById('cw-clues');
    data.words.forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${w.num} ${w.dir}: ${w.clue}`;
        li.dataset.word = w.word;
        if (data.solved.includes(w.word)) li.classList.add('solved');
        cluesEl.appendChild(li);
    });

    // Auto-advance
    document.querySelectorAll('.cw-cell input').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            const all = document.querySelectorAll('.cw-cell input');
            const idx = Array.from(all).indexOf(this);
            if (this.value && all[idx + 1]) all[idx + 1].focus();
        });
    });
}

function checkCrossword() {
    const data = state.gameData;
    const inputs = document.querySelectorAll('.cw-cell input');
    let allCorrect = true;

    inputs.forEach(input => {
        const val = input.value.toUpperCase();
        const ans = input.dataset.ans.toUpperCase();
        if (val === ans) {
            input.style.color = 'var(--green)';
        } else {
            input.style.color = 'var(--error)';
            allCorrect = false;
        }
    });

    if (allCorrect) {
        state.correctCount = state.totalQuestions;
        state.score += state.totalQuestions * 20;
        updateScore();
        playSound('win');
        setTimeout(() => showResult(), 1000);
    } else {
        playSound('wrong');
    }
}

// ========================================
// UI CONTROL & NAVIGATION
// ========================================

function updateScore() {
    const el = document.getElementById('nav-score');
    if (el) el.textContent = state.score;
    const arenaEl = document.getElementById('arena-score');
    if (arenaEl) arenaEl.textContent = state.score;
}

function showLevelSelect() {
    playSound('click');
    document.getElementById('level-modal').classList.add('active');
}

function hideLevelSelect() {
    document.getElementById('level-modal').classList.remove('active');
}

function showLeaderboard() {
    playSound('click');
    renderLeaderboard('easy');
    document.getElementById('leaderboard-modal').classList.add('active');
}

function hideLeaderboard() {
    document.getElementById('leaderboard-modal').classList.remove('active');
}

function switchLbTab(level) {
    playSound('click');
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderLeaderboard(level);
}

function renderLeaderboard(level) {
    const lb = getLeaderboard(level);
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    lb.forEach((entry, i) => {
        const div = document.createElement('div');
        div.className = 'lb-item';
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
        div.innerHTML = `
            <div class="lb-rank ${rankClass}">${i + 1}</div>
            <div class="lb-name">${entry.name}</div>
            <div class="lb-score">${entry.score}</div>
        `;
        list.appendChild(div);
    });
}

function showAbout() {
    playSound('click');
    document.getElementById('about-modal').classList.add('active');
}

function hideAbout() {
    document.getElementById('about-modal').classList.remove('active');
}

function startGame(level) {
    playSound('click');
    state.currentLevel = level;
    state.totalScore = loadFromLocal('total_score_' + level, 0);
    hideLevelSelect();
    window.location.href = 'game.html?level=' + level;
}

function goHome() {
    playSound('click');
    window.location.href = 'index.html';
}

function backToHub() {
    playSound('click');
    stopTimer();
    document.getElementById('game-arena').classList.add('hidden');
    document.getElementById('game-hub').style.display = 'block';
    document.getElementById('result-modal').classList.remove('active');
    state.score = 0;
    updateScore();
    renderGameHub();
}

function launchGame(gameId) {
    playSound('click');
    initAudio();
    state.currentGame = gameId;
    state.score = 0;
    state.correctCount = 0;
    updateScore();

    document.getElementById('game-hub').style.display = 'none';
    document.getElementById('game-arena').classList.remove('hidden');

    const game = gamesList.find(g => g.id === gameId);
    document.getElementById('arena-title').textContent = game.name;

    // Show/hide timer based on game
    const timerWrap = document.getElementById('arena-timer-wrap');
    const hasTimer = ['typing', 'guessword', 'wordsearch', 'memory'].includes(gameId);
    timerWrap.style.display = hasTimer ? 'flex' : 'none';

    // Initialize specific game
    switch(gameId) {
        case 'wordmatch': initWordMatch(); break;
        case 'grammar': initGrammarQuiz(); break;
        case 'memory': initMemoryCard(); break;
        case 'fillblank': initFillBlank(); break;
        case 'conversation': initConversation(); break;
        case 'typing': initSpeedTyping(); break;
        case 'guessword': initGuessWord(); break;
        case 'scramble': initSentenceScramble(); break;
        case 'synonym': initSynonym(); break;
        case 'antonym': initAntonym(); break;
        case 'verbtense': initVerbTense(); break;
        case 'listening': initListening(); break;
        case 'spelling': initSpelling(); break;
        case 'wordsearch': initWordSearch(); break;
        case 'crossword': initCrossword(); break;
    }
}

function replayGame() {
    document.getElementById('result-modal').classList.remove('active');
    launchGame(state.currentGame);
}

function showResult() {
    stopTimer();
    const accuracy = state.totalQuestions > 0 ? Math.round((state.correctCount / state.totalQuestions) * 100) : 0;

    document.getElementById('result-score').textContent = state.score;
    document.getElementById('result-correct').textContent = `${state.correctCount}/${state.totalQuestions}`;
    document.getElementById('result-accuracy').textContent = accuracy + '%';

    let msg = '';
    let icon = 'fa-trophy';
    if (accuracy >= 80) {
        msg = 'Luar biasa! Kamu benar-benar menguasai ini! 🔥';
        icon = 'fa-crown';
        confetti.burst(150);
        playSound('win');
    } else if (accuracy >= 50) {
        msg = 'Kerja bagus! Terus latih ya! 💪';
        icon = 'fa-thumbs-up';
        confetti.burst(50);
        playSound('correct');
    } else {
        msg = 'Jangan menyerah! Coba lagi! 🌟';
        icon = 'fa-redo';
        playSound('wrong');
    }

    document.getElementById('result-message').textContent = msg;
    document.getElementById('result-icon').innerHTML = `<i class="fas ${icon}"></i>`;

    // Save progress
    const percent = Math.round((state.correctCount / state.totalQuestions) * 100);
    saveGameProgress(state.currentGame, state.currentLevel, percent);
    saveLeaderboard(state.currentLevel, state.score);

    // Update nav total score
    const prevTotal = loadFromLocal('total_score_' + state.currentLevel, 0);
    const newTotal = prevTotal + state.score;
    saveToLocal('total_score_' + state.currentLevel, newTotal);

    document.getElementById('result-modal').classList.add('active');
}

// ========================================
// GAME HUB RENDERING
// ========================================

function renderGameHub() {
    const progress = getGameProgress();
    const overall = getOverallProgress();

    document.getElementById('hub-level').textContent = state.currentLevel.charAt(0).toUpperCase() + state.currentLevel.slice(1);
    document.getElementById('overall-progress').style.width = overall + '%';
    document.getElementById('overall-percent').textContent = overall + '%';

    const grid = document.getElementById('games-grid');
    grid.innerHTML = '';

    gamesList.forEach((game, i) => {
        const gp = progress[game.id]?.[state.currentLevel] || 0;
        const card = document.createElement('div');
        card.className = 'game-card';
        card.style.animationDelay = (i * 0.05) + 's';
        card.innerHTML = `
            <div class="game-card-header">
                <div class="game-card-icon ${game.color}"><i class="fas ${game.icon}"></i></div>
                <div class="game-card-info">
                    <div class="game-card-title">${game.name}</div>
                    <div class="game-card-desc">${game.desc}</div>
                </div>
            </div>
            <div class="game-card-progress">
                <div class="game-card-bar"><div class="game-card-fill" style="width:${gp}%;background:linear-gradient(90deg,var(--purple),var(--pink));"></div></div>
            </div>
            <div class="game-card-footer">
                <div class="game-card-stats">
                    <span><i class="fas fa-chart-pie"></i> ${gp}%</span>
                    <span><i class="fas fa-star"></i> ${gp >= 80 ? 'Gold' : gp >= 50 ? 'Silver' : 'Bronze'}</span>
                </div>
                <div class="game-card-play"><i class="fas fa-play"></i></div>
            </div>
        `;
        card.onclick = () => launchGame(game.id);
        grid.appendChild(card);
    });
}

function renderPreviewGrid() {
    const grid = document.getElementById('preview-grid');
    if (!grid) return;

    gamesList.forEach(game => {
        const card = document.createElement('div');
        card.className = 'preview-card';
        card.innerHTML = `
            <div class="preview-icon ${game.color}"><i class="fas ${game.icon}"></i></div>
            <div class="preview-name">${game.name}</div>
        `;
        card.onclick = () => showLevelSelect();
        grid.appendChild(card);
    });
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    confetti = new ConfettiSystem();

    // Loading screen
    const loading = document.getElementById('loading-screen');
    if (loading) {
        setTimeout(() => {
            loading.classList.add('hidden');
        }, 2500);
    }

    // Check page
    const isGamePage = document.getElementById('game-hub') !== null;

    if (isGamePage) {
        // Parse level from URL
        const params = new URLSearchParams(window.location.search);
        const level = params.get('level') || 'easy';
        state.currentLevel = level;

        // Update nav level
        const navLevel = document.getElementById('nav-level');
        if (navLevel) {
            navLevel.textContent = level.toUpperCase();
            navLevel.className = 'nav-level ' + level + '-level';
        }

        renderGameHub();
    } else {
        // Landing page
        renderPreviewGrid();
    }

    // Initialize audio on first interaction
    document.addEventListener('click', () => {
        initAudio();
    }, { once: true });
});

// Global mouse events for word search drag
let mouseDown = false;
document.addEventListener('mousedown', () => mouseDown = true);
document.addEventListener('mouseup', () => {
    if (mouseDown && state.currentGame === 'wordsearch' && state.gameData?.selecting) {
        endWsSelect();
    }
    mouseDown = false;
});