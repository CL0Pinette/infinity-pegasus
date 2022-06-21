import { parse } from 'node-html-parser';
import { component_subscribe } from 'svelte/internal';


export function parseTable(table,semester) {
	let marks = [];
	try {
		let text = table.split('<div id="bloc_0_TITRE" style=\'\' class=\'dsp_data_div\'>').pop();
		const root = parse(text);
		const e1 = root.querySelectorAll('.dsp_data_tr');
		
		let MATIERE = "";
		let MODULE = "";
		let filtered = e1.filter((e) => {
			const e1 = e.querySelectorAll('td');
			let good = null;
			let bad = null;
			e1.forEach(ee1 => {
				if (ee1.getAttribute('title') === 'Type de note' && ee1.querySelector('div').innerText !== "&nbsp;" && ee1.querySelector('div').innerText !== "" && ee1.querySelector('div').innerText !== undefined && !ee1.querySelector('div').innerText.toLowerCase().includes("Module".toLowerCase())) good = ee1;
				if (ee1.getAttribute('title') === "Libellé du produit" && ee1.querySelector('div').innerText !== "&nbsp;" && ee1.querySelector('div').innerText !== "" && ee1.querySelector('div').innerText !== undefined && !ee1.querySelector('div').innerText.toLowerCase().includes("Module".toLowerCase())){
					MATIERE = ee1.querySelector('div').innerText;
					if (MATIERE[MATIERE.length-1] == "-") MATIERE = MATIERE.slice(0,MATIERE.length-1);
					if (!ee1.querySelector('div').innerText.includes(semester)){
						bad = true;
						good = null;
						return;
					}
					good = null;
					return;
				}
				else if (ee1.getAttribute('title') === "Libellé du produit" && ee1.querySelector('div').innerText.toLowerCase().includes("Module".toLowerCase())){
					MODULE = ee1.querySelector('div').innerText;
					if (MODULE[MODULE.length-1] == "-") MODULE = MODULE.slice(0,MODULE.length-1);
					if (! MODULE.includes(semester)){
						bad = true;
						good = null;
						return;
					}
					good = null;
					return;
				}
				else if (ee1.getAttribute('title') === "Libellé du produit"){
					ee1.querySelector('div').set_content(MODULE+"\xff"+MATIERE);
					good = ee1;
				}
				if (ee1.getAttribute('title') == "Type de note" && ee1.querySelector('div').innerText.includes("Moy")){
					good = null;
					return;
				}
			});
			if (!good || bad) return false;
			return true;
		});
		
		filtered.forEach((e) => {
			let TYPE;
			let DATE;
			let NOTE;			
			
			const e1 = e.querySelectorAll('td');
			e1.forEach(ee1 => {
				if (ee1.getAttribute('title') == "Libellé du produit" ) [MODULE,MATIERE] = ee1.querySelector('div').innerText.split("\xff");
				if (ee1.getAttribute('title') == 'Type de note') TYPE = ee1.querySelector('div').innerText;
				if (ee1.getAttribute('title') == 'Date') DATE = ee1.querySelector('div').innerText;
				if (ee1.getAttribute('title') == 'Note (Cc 1,00) (Cn 1,00)' || (ee1.getAttribute('title') == 'Note (Cc 1,00)' && ee1.querySelector('div').innerText.trim() == '0.00')) NOTE = ee1.querySelector('div').innerText;
			});	
			if (MATIERE && DATE && TYPE)
			marks.push({module:MODULE,matiere:MATIERE.replace(" Partiel","").replace(" CC",""),date:DATE,type:TYPE,note:NOTE});
		});
		
		
		
	} catch (error) {
		console.error(error);
	};
	
	
	return marks;
};

export function parseSemester(table) {
	let semesters = [];
	try {
		let text = table.split('<div id="bloc_0_TITRE" style=\'\' class=\'dsp_data_div\'>').pop();
		const root = parse(text);
		const e1 = root.querySelectorAll('.dsp_data_tr');
		
		let MATIERE = "";
		let YEAR = "";
		let semester = "";
		e1.forEach(e => {
			const e1 = e.querySelectorAll('td');
			e1.forEach(ee1 => {
				if (ee1.getAttribute('class') == "dsp_data_td_img" && ee1.querySelector('div')){
					if (ee1.querySelector('div').querySelector('input').id.includes("annee")){
						YEAR = ee1.querySelector('div').querySelector('input').id;
						YEAR = YEAR.split("_").at(-1);
					}
				}
				
				if (ee1.getAttribute('title') == "Libellé du produit" && ee1.querySelector('div').innerText != "&nbsp;" && ee1.querySelector('div').innerText != "" && ee1.querySelector('div').innerText != undefined){
					MATIERE = ee1.querySelector('div').innerText;
					semester = MATIERE.split(" ")[1];
					if (!(semesters.map(e => e.value).includes(semester))){
						semesters.push({name:semester,value:semester,year:YEAR});
					}
				}
			});
		});
		
		return {id:"PARAM_produit",name:"Semestres",values:semesters};
		
	} catch (error) {
		console.error(error);
	};
};

export async function parseYear(table) {
	try {
		let years = [];
		let values;
		let id = 0;
		let text = table.split('<div id="bloc_0_TITRE" style=\'\' class=\'dsp_data_div\'>').pop();
		const root = parse(text);
		const e1 = root.querySelectorAll('.dsp_data_tr');
		
		let YEAR = "";
		let year = "";
		e1.forEach(e => {
			const e1 = e.querySelectorAll('td');
			e1.forEach(ee1 => {
				if (ee1.getAttribute('class') == "dsp_data_td_img" && ee1.querySelector('div')){
					if (ee1.querySelector('div').querySelector('input').id.includes("annee")){
						YEAR = ee1.querySelector('div').querySelector('input').id;
						year = YEAR.split("_").at(-1);
						if (!(years.map(e => e.year).includes(year))){
							years.push({name:year,value:year});
							id++;
						}
					}
				}
			});
		});
		
		
		return {id:"PARAM_annee",name:"Années",values:years};
		
	} catch (error) {
		console.error(error);
	};
};
const coefficients = {
	"S1": (await import('./coefficients/s1_2026')).default,
	"S2": (await import('./coefficients/s2_2026')).default
}

export async function sortModules(marks,semester){

	let marksSorted = marks.reduce(function(prev, cur) {
		if (!prev[cur.module]) prev[cur.module] = [];
		prev[cur.module].push({matiere:cur.matiere,date:cur.date,type:cur.type,note:cur.note});
		return prev;
	}, {});
	
	Object.keys(marksSorted).forEach(e => marksSorted[e] = marksSorted[e].reduce(function(prev, cur) {
		if (!prev[cur.matiere]){
			prev[cur.matiere] = [];
		}
		prev[cur.matiere].push({date:cur.date,type:cur.type,note:cur.note});
		return prev;
	},{}));

	let id = 0;
	let finalMarks = {
		average:getAverageMarks(marksSorted,semester),
		classAverage:undefined,
		marks: Object.keys(marksSorted).map( m => {
			return {
				id:getModSlug(m.replace(/.*Module /,"")),
				name:m.replace(/.*Module /,""),
				credits:getCoefMod(m.replace(/.*Module /,"")),
				grade:undefined,
				average: getAverageMod(m,marksSorted,semester),
				classAverage:undefined,
				subjects:Object.keys(marksSorted[m]).map(mat => {
					return {
						name:mat.replace(/.*Matière /,"").replace(/.*S2 /,""),
						id: getMatSlug(mat.replace(/.*Matière /,"").replace(/.*S[0-9] /,"")),
						grade: undefined,
						average:getAverageMat(m,mat,marksSorted,semester),
						classAverage:undefined,
						coefficient:coefficients[semester][getModSlug(m.replace(/.*Module /,""))][getMatSlug(mat.replace(/.*Matière /,"").replace(/.*S[0-9] /,""))]["_subject"],
						marks: marksSorted[m][mat].map(note => {
							return {
								id:id++,
								classAverage:undefined,
								value: note.note ? parseFloat(note.note) : undefined,
								coefficient:coefficients[semester][getModSlug(m.replace(/.*Module /,""))][getMatSlug(mat.replace(/.*Matière /,"").replace(/.*S[0-9] /,""))][note.type],
								name:`${note.type} - ${note.date}`
							}
						})
					}
				})
			}
		})
	}


	return finalMarks;
}


function getAverageMat(m,mat,marks,semester){
	let moy = 0;
	let coeff = 0;
	let nbMarks = marks[m][mat].filter(e => {
		if (e.note) return true;
		return false;
	}).length;
	if (nbMarks === 0) return undefined;
	moy = marks[m][mat].reduce((p,c) => {
		if (c.note){
			p = p+parseFloat(c.note)*coefficients[semester][getModSlug(m.replace(/.*Module /,""))][getMatSlug(mat.replace(/.*Matière /,"").replace(/.*S[0-9] /,""))][c.type];
			coeff+=coefficients[semester][getModSlug(m.replace(/.*Module /,""))][getMatSlug(mat.replace(/.*Matière /,"").replace(/.*S[0-9] /,""))][c.type];
		}
		return p;
	},0) / coeff;
	return moy;
}

function getAverageMod(mod,marks,semester){
	let moy = 0;
	let nbMat = 0;
	let coeff = 0;
	let markMat;
	moy = Object.keys(marks[mod]).reduce((p,c) => {
		markMat = getAverageMat(mod,c,marks,semester);
		if (markMat){
			p = p+markMat*coefficients[semester][getModSlug(mod.replace(/.*Module /,""))][getMatSlug(c.replace(/.*Matière /,"").replace(/.*S[0-9] /,""))]["_subject"];
			coeff+=coefficients[semester][getModSlug(mod.replace(/.*Module /,""))][getMatSlug(c.replace(/.*Matière /,"").replace(/.*S[0-9] /,""))]["_subject"];
			nbMat ++;
		}
		return p;
	},0) / coeff;
	if (nbMat === 0) return undefined;
	return moy;
}

function getAverageMarks(marks,semester){
	let moy = 0;
	let nbMod = 0;
	let coeff = 0;
	let markMod;
	moy = Object.keys(marks).reduce((p,c) => {
		markMod = getAverageMod(c,marks,semester);
		if (markMod){
			p = p+markMod*getCoefMod(c);
			coeff+=getCoefMod(c);
			nbMod ++;
		}
		return p;
	},0) / coeff;
	if (nbMod === 0) return undefined;
	return moy;
}

function getModSlug(mat){
	if (mat.includes("Mathématiques")) return "MATHS"
	if (mat.includes("Algorithmique")) return "ALGO"
	if (mat.includes("Informatique pratique")) return "IP"
	if (mat.includes("Sciences de l'ingénieur")) return "SI"
	if (mat.includes("Sciences humaines")) return "SH"
}

function getMatSlug(mat){
	if (mat.includes("Algo")) return "ALGO"
	if (mat.includes("Math")) return "MATHS"
	if (mat.includes("Projet")) return "PROJ"
	if (mat.includes("Programmation") || mat.includes("Projet")) return "IP"
	if (mat.includes("Physique")) return "PHYS-ELEC"
	if (mat.includes("Nouvelles")) return "NTS"
	if (mat.includes("Archi")) return "ARCHI"
	if (mat.includes("Méthodologie")) return "TE"
	if (mat.includes("Anglais technique")) return "CIE"
	if (mat.includes("Anglais")) return "TIM"
}

function getCoefNote(mod){
	if (mod.includes("SEMINAIRE")) return 3.0;
	if (mod.includes("AFIT")) return 3.0;
	if (mod.includes("CC ECRIT")) return 2.0;
	return 1.0;
}

function getCoefMat(mat){
	if (mat.includes("Mathématiques")) return 3.0;
	if (mat.includes("Algorithmique")) return 2.0;
	if (mat.includes("Projet")) return 4.0;
	if (mat.includes("Programmation")) return 3.0;
	if (mat.includes("Physique-Electronique")) return 2/3;
	if (mat.includes("Nouvelles technologies et société")) return 2/3;
	if (mat.includes("Architecture")) return 2/3;
	if (mat.includes("Anglais")) return 24/20;
	if (mat.includes("Méthodologie")) return 16/20;

	return 1.0;
}

function getCoefMod(mod){
	if (mod.includes("Mathématiques")) return 3.0;
	if (mod.includes("Algorithmique")) return 2.0;
	if (mod.includes("Programmation")) return 2.0;
	if (mod.includes("ingémieur")) return 2.0;
	return 2.0;
}


// {
// 	averages: 15.04,
// 	classAverage: 12.03, // Moyenne de la promo
// 	marks: [
// 	  { // = Un module
// 		id: 'II2', // Peut être undefined (certains modules n'en ont pas)
// 		name: 'Informatique industrielle 2',
// 		credits: 3.0, // Nombre de crédit ECTS (qui correspond aussi au coef du coup)
// 		grade: 'A', // Seulement si le bulletin est dispo (c'est qu'en ING je crois), sinon c'est undefined
// 		average: 15.04,
// 		classAverage: 12.03,
// 		subjects: [
// 		  {
// 			name: 'Approximation de fonction',
// 			id: 'APXF',
// 			grade: 'A', // Pareil qur pour le module
// 			average: 15.04,
// 			classAverage: 12.03,
// 			coefficient: 2.0, // Normalisé (ya au moins un sujet du module qui est coef 1 du coup)
// 			marks: [
// 			  {
// 				id: 0, // Ordre d'apparition dans le relevé (sert à différencier les notes qui ont le même nom)
// 				classAverage: 12.03, // Peut être undefined
// 				value: 15.04, // Peut être undefined
// 				coefficient: 0.4, // Normalisé (entre 0 et 1, et la somme des coeficients des notes d'un sujet = 1)
// 				name: 'Devoir CC1'
// 			  }
// 			]
// 		  }
// 		]
// 	]
//   }