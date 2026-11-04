const rail12=document.querySelector('.dispatch');rail12.querySelector('#levelDesc').after($('clickCoach12'));$('clickCoach12').after($('nextTask'));
const originalCoachClear12=clearCoach12;clearCoach12=function(){originalCoachClear12();rail12.classList.remove('hasCoach12')};
let scrolledCoach12='';setInterval(()=>{let shown=!$('clickCoach12').classList.contains('hide');rail12.classList.toggle('hasCoach12',shown);if(shown&&coachingId12&&coachingId12!==scrolledCoach12){scrolledCoach12=coachingId12;$(coachingId12).scrollIntoView({block:'nearest',behavior:'smooth'})}},200);
