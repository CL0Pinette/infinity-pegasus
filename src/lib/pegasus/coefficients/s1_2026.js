// ----------------------
// READ ME!
// ----------------------
//
// Both ID and names can be used for both subjects and marks (marks ID are their order in the list)
// Subjects or marks with a coefficient of 1 (or equivalent) can be omitted
// Coefficient does not have to sum up to 1, since the sum of the coefficients will be used
// No need to specify module coefficients, since they are already retrieved from the PDF
// Also, regex are supported for marks name :^) (which means '[' must be escaped !)

export default {
    ALGO: {
        ALGO:{
            _subject:2,
            "CC ECRIT": 4 /22,
            SEMINAIRE: 3 / 22,
            "CC QCM": 4/7 / 22,
            PARTIEL: 11 / 22
        }
    },
    MATHS:{
        MATHS: {
            _subject:3,
            "CC ECRIT": 4 / 30,
            TD: 2 / 30,
            SEMINAIRE: 3 / 30,
            PARTIEL: 15 / 30,
            "CC QCM": 4/7 / 30
        },
    },
    IP: {
        IP:{
            _subject:2,
            "CC ECRIT":  3 / 14,
            "CC Suivi":  4 / 14,
            PARTIEL:  7 / 14,
        }
    },
    SI: {
        NTS:{
            _subject:2/3,
            "CC QCM": 4/3 / 8,
            "CC Suivi": 4/2 / 8,
        },
        ARCHI: {
            _subject:2/3,
            "CC QCM": 4/7 / 16,
            "CC ECRIT": 4 / 16,
            PARTIEL:8 / 16
        },
        "PHYS-ELEC": {
            _subject:2/3,
            "CC QCM": 4/7 / 16,
            "CC ECRIT": 4 / 16,
            PARTIEL:8/16
        }
    },
    SH:{
        TE: {
            _subject:16/20,
            PARTIEL:1/2,
            "CC Suivi":2/3 / 2,
            "CC ECRIT":1/6 / 2,
            "CC Projet Voltaire": 1/6 /2
        },
        CIE: {
            _subject:12/20,
            "CC QCM": 376173/637208 / 7 / 2,
            "CC Suivi": 1/10 / 2,
            "CC ECRIT": 1/10 / 2,
            "CC Suivi Oral":1/10 /2,
            PARTIEL:1/2
        },
        TIM: {
            _subject:12/20,
            "CC QCM": 1/10 / 7 /2,
            "CC Suivi":452/775 /2,
            "CC Suivi Oral":1/10 /2,
            "CC ECRIT":1/10 /2,
            "TOEIC":1/10 /2,
            PARTIEL:1/2
        }
    }
};