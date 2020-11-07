document.addEventListener('DOMContentLoaded', (function () {
    'use strict';

    function get(selector, scope = document) {
        return scope.querySelector(selector);
    }

    function getAll(selector, scope = document) {
        return scope.querySelectorAll(selector);
    }

    function expandAbbrev(abbrev) {
        switch (abbrev) {
            case 'gened':
                return 'Gen. Ed.';
                break;
            case 'fye':
                return 'First Year Experience';
                break;
            case 'social':
                return 'Behav. & Social Science';
                break;
            case 'math':
                return 'Mathematics';
                break;
            case 'english':
                return 'English Composition';
                break;
            case 'writing':
                return 'Writing Emphasis';
                break;
            case 'speaking':
                return 'Speaking Emphasis';
                break;
            case 'i':
                return 'Interdisciplinary';
                break;
            case 'j':
                return 'Diverse Communities';
                break;
            case 'complex':
                return 'Complex Large-Scale Systems';
                break;
            default:
                return capitalizeFirstLetter(abbrev);
        }

        function capitalizeFirstLetter(string) {
            return string[0].toUpperCase() + string.slice(1);
        }
    }

    function createCourses() {
        let request = new XMLHttpRequest();
        let requestURL = 'https://raw.githubusercontent.com/gw859060/four-year-plan/main/courses.json';

        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
        request.addEventListener('load', function () {
            createCourseObjects();
        });

        function createCourseObjects() {
            let crsArray = [];
            let crs = request.response.years[0].semesters[0].courses[0];
            let crs2 = request.response.years[0].semesters[0].courses[1];

            let course1 = new Course(crs.subject, crs.number, crs.name, crs.requirement, crs.attribute, crs.credits, 1, 1);
            let course2 = new Course(crs.subject, crs.number, crs.name, crs.requirement, crs.attribute, crs.credits, 1, 1);

            crsArray.push('course1', 'course2');

            console.log(course1.shorthand());

            // let found1 = crsArray.find(course => {
            //     course.name.subject === 'CSC';
            // });

            // crsArray.forEach((obj, i) => {
            //     console.log(obj);
            // });
        }

        function Course(subject, number, fullname, requirement, attribute, credits, year, semester) {
            this.name = {
                'subject': subject,
                'number': number,
                'fullname': fullname
            };
            this.shorthand = function () {
                return this.name.subject + ' ' + this.name.number;
            };
            this.requirement = requirement;
            this.attribute = attribute;
            this.credits = credits;
            this.year = year;
            this.semester = semester;
        }
    }

    // @TODO: make this await createCourses
    // @TODO: allow user input via localStorage
    function initRequirements() {
        let request = new XMLHttpRequest();
        let requestURL = 'https://raw.githubusercontent.com/gw859060/four-year-plan/main/requirements.json';

        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
        request.addEventListener('load', function () {
            buildRequirements();
        });

        function buildRequirements() {
            /* ***** GEN EDS ***** */
            let geneds = request.response.gened[0];
            let academic = geneds.academic;
            let distributive = geneds.distributive;
            let additional = geneds.additional;

            academic.forEach((attr, i) => {
                let parentNode = get('.gened .academic');

                buildAttrRow(attr, parentNode, i);
            });

            distributive.forEach((attr, i) => {
                let parentNode = get('.gened .distributive');

                buildAttrRow(attr, parentNode, i);
            });

            additional.forEach((attr, i) => {
                let parentNode = get('.gened .additional');

                buildAttrRow(attr, parentNode, i);
            });

            /* ***** MAJOR ***** */
            let major = request.response.major[0];
            let majorCore = major.core;
            let majorMath = major.mathematics;
            let majorElectives = major.electives;

            majorCore.forEach((attr, i) => {
                let parentNode = get('.section-major .core');

                buildAttrRow(attr, parentNode, i);
            });

            majorMath.forEach((attr, i) => {
                let parentNode = get('.section-major .mathematics');

                buildAttrRow(attr, parentNode, i);
            });

            majorElectives.forEach((attr, i) => {
                let parentNode = get('.section-major .electives');

                buildAttrRow(attr, parentNode, i);
            });

            /* ***** MINOR ***** */
            let minor = request.response.minor[0];
            let minorCore = minor.core;
            let minorCoreParent = get('.section-minor .core');
            let minorElectives = minor.electives;
            let minorElectiveParent = get('.section-minor .electives');

            // only one attr in each section so no need for forEach
            buildAttrRow(minorCore, minorCoreParent, 0);
            buildAttrRow(minorElectives, minorElectiveParent, 0);
        }

        function buildAttrRow(attr, parentNode, i) {
            let attrTemplate = get('.template-attribute').content.cloneNode(true);
            let nameNode = get('.attribute-name', attrTemplate);
            let courseNode = get('.attribute-course', attrTemplate);

            if (i !== 0) parentNode.appendChild(document.createElement('hr'));
            get('.attribute', attrTemplate).classList.add(attr.attribute);
            parentNode.appendChild(attrTemplate);

            nameNode.textContent = expandAbbrev(attr.attribute);
            courseNode.textContent = '—';

            if (attr.number !== 1) {
                // only show number of courses required if more than one
                let numberNode = document.createElement('span');

                numberNode.classList.add('subdued');
                numberNode.textContent = ' (' + attr.number + ')';
                nameNode.appendChild(numberNode);

                // create remaining rows
                let rowCount = attr.number - 1;

                while (rowCount > 0) {
                    let attrTemplate = get('.template-attribute').content.cloneNode(true);
                    let courseNode = get('.attribute-course', attrTemplate);

                    get('.attribute', attrTemplate).classList.add(attr.attribute);
                    courseNode.textContent = '—';
                    parentNode.appendChild(attrTemplate);
                    rowCount--;
                }
            }

        }
    }

    // @TODO: make this await createCourses
    // @TODO: allow user input via localStorage
    // @TODO: use WCUPA api
    //        <https://catalog.wcupa.edu/js/courseleaf.js>
    //        <https://catalog.wcupa.edu/ribbit/index.cgi?page=getcourse.rjs&code=CSC%20142>
    //        <https://stackoverflow.com/questions/5031501/how-to-rate-limit-ajax-requests>
    // @TODO: toggle switch for compact/expanded views
    // @TODO: show a vertical timeline w/ dotted line, layout flipping sides every other year
    //        <https://css-tricks.com/building-a-conference-schedule-with-css-grid/>
    //        <https://codyhouse.co/demo/schedule-template/index.html>
    //                        FALL 2020
    //         SEMESTER 1 YEAR 1     SEMESTER 2 YEAR 1
    //        [   course list   ]   [   course list   ]
    //        [ hourly schedule ]   [ hourly schedule ]
    //
    //                       SPRING 2020
    //         SEMESTER 3 YEAR 2     SEMESTER 4 YEAR 2
    //        [   course list   ]   [   course list   ]
    //        [ hourly schedule ]   [ hourly schedule ]

    function initSchedule() {
        let request = new XMLHttpRequest();
        let requestURL = 'https://raw.githubusercontent.com/gw859060/four-year-plan/main/courses.json';

        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
        request.addEventListener('load', function () {
            buildSchedule();
        });

        function buildSchedule() {
            /* ***** YEARS ***** */

            let years = request.response.years;
            let semesterYear = 2020; // for "Fall 2020", "Spring 2021"; I know it's a bad name

            years.forEach(year => {
                let yearTemplate = get('.template-year').content.cloneNode(true);
                let yearNum = year.year;
                let yearSection = get('.year', yearTemplate);

                get('.course-schedule > *').appendChild(yearTemplate);

                /* ***** SEMESTERS ***** */

                let semesters = year.semesters;

                semesters.forEach(semester => {
                    let semesterNum = semester.semester;
                    let semesterSection = getAll('.semester', yearSection)[semesterNum - 1];
                    let semesterHeader = get('.semester-num', semesterSection);

                    // @TODO: support summer/winter
                    let season = ((semesterNum === 1) ? 'Fall' : 'Spring');

                    semesterHeader.innerHTML = 'Year ' + yearNum + ' <span class="subdued">' + season + ' ' + semesterYear + '</span>';

                    /* ***** COURSES ***** */

                    let courses = semester.courses;
                    let creditTotal = 0;

                    courses.forEach(course => {
                        let courseTemplate = get('.template-course').content.cloneNode(true);
                        let shorthandNode = get('.course-shorthand', courseTemplate);
                        let fullnameNode = get('.course-name', courseTemplate);
                        let reqContainer = get('.req-container', courseTemplate);
                        let creditsNode = get('.course-credits', courseTemplate);

                        shorthandNode.innerHTML = course.subject + ' ' + course.number;
                        linkCourseName(fullnameNode, course.subject, course.number, course.name);
                        handleReq(reqContainer, course.requirement);
                        handleReq(reqContainer, course.attribute);
                        creditsNode.textContent = course.credits + ' cr.';
                        creditTotal += course.credits;

                        semesterSection.appendChild(courseTemplate);
                    });

                    /* ***** TOTALS ***** */

                    let totalTemplate = get('.template-total').content.cloneNode(true);
                    let total = get('.credit-total', totalTemplate);

                    total.textContent = creditTotal + ' cr.';
                    semesterSection.appendChild(totalTemplate);

                    if (semesterNum === 1) semesterYear++;
                });
            });
        }

        function linkCourseName(parentNode, subject, number, name) {
            let link = document.createElement('a');

            link.classList.add('course-link');
            link.setAttribute('target', '_blank');
            link.setAttribute('ref', 'noopener');
            link.setAttribute('title', `Open in course catalog on wcupa.edu`);
            link.href = `https://catalog.wcupa.edu/search/?P=${subject}+${number}`;
            link.textContent = name;
            parentNode.appendChild(link);
        }

        function handleReq(parentNode, abbrev) {
            // if course contains multiple attributes
            if (typeof abbrev === 'object') {
                abbrev.forEach(attr => buildPill(parentNode, attr));
            } else {
                buildPill(parentNode, abbrev);
            }

            function buildPill(parentNode, attr) {
                let pill = document.createElement('button');

                pill.setAttribute('type', 'button');
                pill.classList.add('pill', attr);
                pill.textContent = expandAbbrev(attr);
                pill.addEventListener('click', highlightTiles(), false);

                parentNode.appendChild(pill);
            }
        }

        function highlightTiles() {
            return function () {
                // if target pill is not already selected
                if (this.classList.contains('selected') === false) {
                    let semesters = getAll('.semesters');
                    let selectedPills = getAll('.pill.' + this.classList[1]);

                    // clear existing selections before highlighting new ones
                    // (ie. only one selection at a time)
                    clearSelected();

                    semesters.forEach(semester => semester.classList.add('filtered'));

                    selectedPills.forEach(pill => {
                        pill.classList.add('selected');
                        pill.closest('.course').classList.add('selected');
                    });
                }
                // otherwise you're clicking a selected pill
                else {
                    clearSelected();
                }
            }

            function clearSelected() {
                let selectedPills = getAll('.pill.selected');
                let selectedCourses = getAll('.course.selected');
                let filteredSems = getAll('.semesters.filtered');

                selectedPills.forEach(pill => pill.classList.remove('selected'));
                selectedCourses.forEach(course => course.classList.remove('selected'));
                filteredSems.forEach(semester => semester.classList.remove('filtered'));
            }
        }
    }

    // createCourses();
    initRequirements();
    initSchedule();
})(), false);