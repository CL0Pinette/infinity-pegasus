import { progress } from '../stores';

import { computeAverages, normalizeCoefficients } from './coefficients';
import { parseTable, parseSemester, parseYear, sortModules } from './marks_parser';
import { getDocuments, getTable, MARKS_DOCUMENT, REPORT_DOCUMENT } from './documents';

// Supports :
// - 'ID - Module name [X ECTS]'
// - '[ID] Module name [X ECTS]'
// - 'ID Module name [X ECTS]'
// - 'ID_Module name [X ECTS]'
const MODULE_REGEX = /(((.*) - )|(\[(.*)] )|(([A-Z1-9]+)[_ ]))? ?(.*) \[ *(.*) ECTS]/;
const MARK_REGEX = /\d+,\d\d/g;
const POSITION_THRESHOLD = 5;

async function getMarksTable(semester) {
    const table = await getTable();

    const marks = parseTable(table[0].innerHTML, semester["PARAM_produit"]);

    return marks;
}

export async function getMarksFilters() {
    // S[1-3] reports PDFs sucks A LOT, can't be parsed, and takes a ton of time to fetch, so I filter them out.
    const table = await getTable(); // .then(d => d.fetchFilters());

    const years = await parseYear(table[0].innerHTML);

    const semesters = parseSemester(table[0].innerHTML);

    return [years, semesters] //getFilters(semesters);



    // semester.values = semester.values.filter(v => !v.name.includes('Prépa'));
    // year.values = year.values.filter(v => semester.values.find(vv => vv.year === v.value));

    // return [year, semester];
}

export async function getMarks(filters, noReport) {
    const marks = await getMarksTable(filters);

    let markssorted = sortModules(marks, filters["PARAM_produit"]);

    return markssorted;

    // const blob = await fetchMarksPDF(filters, !noReport);

    // progress.set(`Lecture du ${noReport ? 'relevé': 'bulletin'}`);

    // const pdfjs = window['pdfjs-dist/build/pdf'];
    // pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

    // const doc = await pdfjs.getDocument({ url: URL.createObjectURL(blob) }).promise;
    // const result = [];
    // let averages;

    // for (let i = 1; i <= doc.numPages; i++) {
    //     if (!(averages = await parsePage(await doc.getPage(i), result, !noReport)) && !noReport) {
    //         return getMarks(filters, true);
    //     }
    // }

    // if (noReport) {
    //     averages = computeAverages(filters, markssorted.marks);
    // }

    // normalizeCoefficients(markssorted.marks);

    // return { ...averages, fromReport: !noReport, marks: markssorted.marks };
}

async function fetchMarksPDF(filters, report) {
    const documents = await getDocuments();
    const marks = documents.find(d => d.name === (report ? REPORT_DOCUMENT : MARKS_DOCUMENT));

    progress.set(`Récupération du ${report ? 'bulletin' : 'relevé'} de notes`);
    return marks.fetchBlob(filters);
}

async function parsePage(page, result, report) {
    const content = await page.getTextContent();
    const elements = content.items.filter(i => !i.hasEOL).sort((a, b) => {
        const dy = a.transform[6] - b.transform[6];
        if (dy === 0) {
            return a.transform[5] - b.transform[5];
        }

        return dy;
    });
    const texts = elements.map(i => i.str);

    if (!texts[0] || texts[0] === "L'édition de ce document n'a pas encore été autorisée par la pédagogie.") {
        return false;
    }

    let average, classAverage;
    let i = 0;

    while (i < texts.length) {
        while (i < texts.length && !texts[i].match(MODULE_REGEX)) {
            if (texts[i++] === 'Moyenne du semestre de la promotion') {
                average = parseMark(texts[i++]);
                classAverage = parseMark(texts[i++]);
            }
        }

        while (i < texts.length && texts[i].match(MODULE_REGEX)) {
            const [, , , id, , idBrackets, , idAlone, name, credits] = texts[i++].match(MODULE_REGEX);
            const subjects = [];
            let grade, average, classAverage;

            if (report) {
                i++;
                grade = texts[i++];
                classAverage = parseMark(texts[i++]);
                average = parseMark(texts[i++]);
            }

            while (i < texts.length && texts[i] !== 'Niveau') {
                const [subject, ni] = parseSubject(elements, texts, i, report);

                subjects.push(subject);
                i = ni;
            }

            result.push({ id: id || idBrackets || idAlone, name, credits: parseFloat(credits), grade, average, classAverage, subjects });
        }
    }

    return { average, classAverage };
}

function parseSubject(elements, texts, i, report) {
    const name = texts[i++];
    const id = texts[i++];
    let grade, average, classAverage, coefficient;
    const marks = [];

    if (report) {
        i++;
        grade = texts[i++];
        average = parseMark(texts[i++]);
        i++;
        classAverage = parseMark(texts[i++]);
        coefficient = parseMark(texts[i++]);
    }

    let nextMarkId = 0;
    while (i < texts.length && (texts[i].match(MARK_REGEX) || (i + 1 < texts.length && isMarkCode(texts[i + 1])))) {
        const mark = { id: nextMarkId++ };
        if (texts[i].match(MARK_REGEX)) {
            mark.classAverage = parseMark(texts[i++]);
        }
        const delta = (a, b) => Math.abs(a - b);
        const x = elements[i - 1].transform[4];
        if (delta(x, 464) < delta(x, 506)) { // This means there is no average, only a mark, this can rarely happen
            mark.value = mark.classAverage;
            delete mark.classAverage;
        } else if (texts[i].match(MARK_REGEX)) {
            mark.value = parseMark(texts[i++]);
        }
        if (report) {
            mark.coefficient = parseMark(texts[i++]);
        }

        const markName = texts[i++];

        // This is turbo-sus, but it's the only way to handle mark names being formatted like mark codes.
        // UPDATE: We can use positions instead, if this breaks then they should be used.
        if (isMarkCode(markName) && (texts[i + 2].match(MARK_REGEX) || (!texts[i + 3].match(MARK_REGEX) && !isMarkCode(texts[i + 3]) && texts[i + 3] !== 'Note'))) {
            mark.name = 'Note';
        } else {
            mark.name = markName;
            i++;
        }

        marks.push(mark);
    }

    return [{ name, id, grade, average, classAverage, coefficient, marks }, i];
}

function parseMark(mark) {
    return parseFloat(mark.replace(',', '.'));
}

function isMarkCode(code) {
    return code.match(/^[A-Z]+$/) && code.length > 5;
}
