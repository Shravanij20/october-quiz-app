const MODEL = "gemini-3.6-flash";

const  $= (Selector) => document.getElementById(Selector);

let topic = "";
let questions = [];
let currentQuestions = 0;
let answers = [];

function showScreen(name){
    for(const screen of ["input", "loading", "quiz"]){
        const el = $(`screen-${screen}`);
        if(el){
            el.dataset.screen = String(screen === name);
        }
    }
}

function showError(message){
    alert(message); 
}

async function fetchQuiz(apiKey, topic, difficulty, count){
    const prompt = `You are a quiz generator. 
    Generate a quiz on the topic: ${topic}
        Difficulty: ${difficulty}
        Number of questions: ${count}
        Return JSON only in this shape:
        {
            "questions": [
                {
                    "question": "What is capital of France?",
                    "options": ["London", "Berlin", "Paris", "Madrid"],
                    "answer": "Paris"
                }
            ]
        }
        Each question Must have exactly 4 options and tthe answer must match one of the options
        `


        const res = await fetch(

            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{
                method: "POST",
                headers : {
                    "Content-Type" : "application/json",
                    "x-goog-api-key" : apiKey
                },

                body : JSON.stringify({
                    contents : [{parts : [{text : prompt}]}],
                    generationConfig : {
                        responseMimeType : "application/json"
                    }
                })
            }
        );



            //handling Error
            if(!res.ok){
                const details = await res.text();
                throw new Error(`http error status : ${res.status} ${details}`)
            }

            const data = await res.json();

            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

            if(!text){
                throw new Error("Empty Model response");
            }

            const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .trim();

            const parsed = JSON.parse(cleaned);
            const list = parsed.questions || parsed;

            if(!Array.isArray(list)  || list.length === 0){
                throw new Error("No questions returned");
            }

            return list;
}



$("quizForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const apiKey = $("apiKeyInput").value.trim();
    const quiztopic = $("topicInput").value.trim();
    const difficulty = $("difficultyInput").value.trim();
    const count = $("countInput").value.trim();

    if(!apiKey || !quiztopic){
        showError("Please fill all the fields")
        return;
    }

    topic = quiztopic;
    showScreen("loading")

    try{

        questions = await fetchQuiz(apiKey, quiztopic, difficulty, count);
        currentQuestions = 0;
        answers = new Array(questions.length).fill(null);
        showScreen("quiz");
        showQuestion()


    }catch(err){
        console.log("An error occurred while generating quiz", err);
        showError(err.message)
        showScreen("input")
    }
})



function showQuestion(){
    const q = questions[currentQuestions];
    const total = questions.length;
    const letters = ["A", "B", "C", "D"];

    $("quizTopicLabel").textContent = topic;
    $("quizProgress").textContent = `Question ${currentQuestions + 1} of ${total}`;
    $("progressFill").style.width = `${((currentQuestions + 1) / total) * 100}%`;
    $("questionText").textContent = q.question;

    const container = $("optionsContainer");
    container.innerHTML = "";
    const nextBtn = $("nextBtn");
    nextBtn.disabled = answers[currentQuestions] === null;
    $("prevBtn").disabled = currentQuestions === 0;


    q.options.forEach((text, i) =>{
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option";
        btn.dataset.selected = String(answers[currentQuestions] === i);
        btn.innerHTML = `<span class = "option_letter">${letters[i]}</span>  ${text}`


        btn.onclick = () => {
            answers[currentQuestions] = i;
            [...container.children].forEach((b, j) => {
                b.dataset.selected = String(j === i);
            });

            nextBtn.disabled = false;
        };

        container.appendChild(btn);

    })


}



$("nextBtn").onclick = () => {
    if(currentQuestions === questions.length - 1){
        console.log("Quiz finished")
    }else{
        currentQuestions++;
        showQuestion();
    }
}


$("prevBtn").onclick = () => {
    if(currentQuestions === 0) return;
        currentQuestions--;
        showQuestion();
};