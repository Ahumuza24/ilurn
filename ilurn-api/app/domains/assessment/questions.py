WRAT_LETTERS = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
]

WRAT_WORDS = [
    "cat",
    "see",
    "red",
    "to",
    "big",
    "work",
    "book",
    "read",
    "spell",
    "then",
    "stop",
    "play",
    "run",
    "hand",
    "jump",
    "water",
    "boy",
    "girl",
    "house",
    "car",
    "tree",
    "dog",
    "apple",
    "sun",
    "fish",
    "green",
    "little",
    "school",
    "mother",
    "father",
    "yellow",
    "friend",
    "music",
    "teacher",
    "window",
    "garden",
    "family",
    "picture",
    "because",
    "animal",
    "morning",
    "different",
    "important",
    "sentence",
    "children",
    "country",
    "question",
    "beautiful",
    "remember",
    "together",
    "knowledge",
    "education",
    "language",
    "community",
    "achievement",
]

SPELLING_WORDS = [
    {"word": "go", "sentence": "I will go to the store."},
    {"word": "cat", "sentence": "The cat is sleeping."},
    {"word": "in", "sentence": "Put it in the box."},
    {"word": "boy", "sentence": "The boy is running."},
    {"word": "and", "sentence": "You and I."},
    {"word": "will", "sentence": "I will help you."},
    {"word": "make", "sentence": "Let's make a cake."},
    {"word": "him", "sentence": "Give it to him."},
    {"word": "say", "sentence": "What did you say?"},
    {"word": "cut", "sentence": "Cut the paper."},
    {"word": "cook", "sentence": "I like to cook."},
    {"word": "light", "sentence": "Turn on the light."},
    {"word": "school", "sentence": "We go to school."},
    {"word": "friend", "sentence": "My friend is kind."},
    {"word": "teacher", "sentence": "The teacher reads a book."},
]


def get_word_reading_questions() -> list[dict[str, str]]:
    letters = [
        {"id": f"letter_{index}", "type": "letter", "text": letter, "difficulty": "letter"}
        for index, letter in enumerate(WRAT_LETTERS)
    ]
    words = [
        {"id": f"word_{index}", "type": "word", "text": word, "difficulty": _word_difficulty(index)}
        for index, word in enumerate(WRAT_WORDS)
    ]
    return [*letters, *words]


def get_spelling_questions() -> list[dict[str, str]]:
    return [
        {
            "id": f"spell_{index}",
            "type": "word",
            "text": item["word"],
            "sentence": item["sentence"],
            "difficulty": _word_difficulty(index),
        }
        for index, item in enumerate(SPELLING_WORDS)
    ]


def _word_difficulty(index: int) -> str:
    if index < 15:
        return "easy"
    if index < 35:
        return "medium"
    return "hard"
