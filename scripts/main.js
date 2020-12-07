(function () {
    'use strict';

    function get(selector, scope = document) {
        return scope.querySelector(selector);
    }

    function getAll(selector, scope = document) {
        return scope.querySelectorAll(selector);
    }

    function fetchData() {
        let base = 'https://gw859060.github.io/four-year-plan/data/';
        let files = ['requirements.json', 'courses.json'];
        let promises = [];

        for (let file of files) {
            promises.push(
                fetch(base + file, {
                    // <https://stackoverflow.com/q/52635660>
                    credentials: 'include',
                    mode: 'no-cors'
                }).then(response => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error(`HTTP ${response.status}: ${file} failed to load.`);
                    }
                })
                .catch(error => {
                    if (!get('.tile.error')) {
                        let warning = document.createElement('div');

                        warning.classList.add('tile', 'dark', 'error');
                        warning.textContent = 'Parts of this page failed to load. Click here to try again.';
                        warning.addEventListener('click', function () {
                            window.location.reload();
                        });
                        get('main').appendChild(warning);
                    }

                    console.log(error);
                })
            );
        }

        Promise.all(promises).then(data => {
            let requirements = data[0];
            let courses = createCourses(data[1]);

            buildRequirements(requirements);
            fillRequirements(courses);
            buildSchedule(courses);
        })
        .catch(console.log);
    }

    function createCourses(json) {
        let courseObjects = [];
        let years = json.years;

        for (let year of years) {
            let semesters = year.semesters;

            for (let semester of semesters) {
                let courses = semester.courses;

                for (let course of courses) {
                    let obj = new Course(
                        course.subject,
                        course.number,
                        course.name,
                        course.requirement,
                        course.attribute,
                        course.credits,
                        year.year,
                        semester.semester
                    );

                    courseObjects.push(obj);
                }
            }
        }

        return courseObjects;

        function Course(subject, number, title, requirement, attribute, credits, year, semester) {
            this.name = {
                'subject': subject,
                'number': number,
                'title': title,
                'shorthand': subject + ' ' + number,
                'id': subject + '-' + number
            };
            this.reqs = {
                'requirement': requirement,
                'attribute': attribute
            };
            this.credits = credits;
            this.year = year;
            this.semester = semester;
            this.tooltip = function () {
                let tooltip = document.createElement('div');

                tooltip.classList.add('tooltip', 'tile', 'dark');

                let header = document.createElement('div');

                header.classList.add('tooltip-title');
                header.textContent = this.name.shorthand + ': ' + title;
                tooltip.appendChild(header);

                let details = document.createElement('div');
                let yearDiff = (semester === 1 || semester === 4) ? year - 1 : year;

                details.classList.add('tooltip-details');
                details.textContent = `${expandYear(year)} Year • `;
                details.textContent += `${expandSemester(semester)} ${2020 + yearDiff}`;
                tooltip.appendChild(details);

                return tooltip;
            };
        }
    }

    // @TODO: make background slide on hover
    function buildNavigation() {
        let links = getAll('.nav-link');

        for (let link of links) {
            link.addEventListener('click', function () {
                let section = link.dataset.section;
                let motion = (window.matchMedia('(prefers-reduced-motion)').matches) ? 'auto' : 'smooth';

                get('.' + section).scrollIntoView({ behavior: motion });
            }, false);
        }
    }

    function buildRequirements(json) {
        /* ***** gen eds ***** */
        let geneds = json.gened[0];
        let genedTypes = ['academic', 'distributive', 'additional'];

        for (let type of genedTypes) {
            geneds[type].forEach((attr, i) => {
                let parentNode = get('.requirement-gened .' + type);

                buildAttrRow(attr, parentNode, i);
            });
        }

        /* ***** major ***** */
        let major = json.major[0];
        let majorTypes = ['core', 'mathematics', 'electives'];

        for (let type of majorTypes) {
            major[type].forEach((attr, i) => {
                let parentNode = get('.section-major .' + type);

                buildAttrRow(attr, parentNode, i);
            });
        }

        /* ***** minor ***** */
        let minor = json.minor[0];

        // only one attr in each section so no need for forEach
        buildAttrRow(minor.core, get('.section-minor .core'), 0);
        buildAttrRow(minor.electives, get('.section-minor .electives'), 0);

        function buildAttrRow(attr, parentNode, i) {
            let attrTemplate = get('.template-attribute').content.cloneNode(true);
            let nameNode = get('.attribute-name', attrTemplate);
            let courseNode = get('.attribute-course', attrTemplate);

            if (i !== 0) parentNode.appendChild(document.createElement('hr'));
            get('.attribute', attrTemplate).classList.add(attr.attribute);
            nameNode.textContent = expandAbbrev(attr.attribute);
            courseNode.textContent = '—';
            parentNode.appendChild(attrTemplate);

            // handle requirements that require more than one course
            if (attr.number !== 1) {
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

    function fillRequirements(courses) {
        let creditTotal = 0;

        /* ***** fill in courses ***** */
        for (let course of courses) {
            let requirement = course.reqs.requirement;
            let attribute = course.reqs.attribute;

            // for summary section
            creditTotal += course.credits;

            // if course meets multiple requirements
            // eg. CSC 301 is major and gen ed
            if (typeof requirement === 'object') {
                requirement.forEach((req, i) => {
                    let sectionNode = (req !== 'gened') ? '.section-' + req : '';
                    let reqNode = get(`.requirement-${req} ${sectionNode} .attribute.${attribute[i]} .attribute-course`);

                    addRow(course, reqNode);
                });
            }
            // if course meets multiple attributes
            // eg. GEO 204 is interdisciplinary and diverse communities
            else if (typeof attribute === 'object') {
                attribute.forEach(attr => {
                    let reqNode = get(`.requirement-${requirement} .attribute.${attr} .attribute-course`);

                    addRow(course, reqNode);
                });
            }
            // otherwise course has a single requirement/attribute pair
            else {
                let sectionNode = (requirement !== 'gened') ? '.section-' + requirement : '';
                let reqNode = get(`.requirement-${requirement} ${sectionNode} .attribute.${attribute} .attribute-course`);

                // handle math separately to allow them to keep the same pill text
                if (requirement === 'major' && attribute === 'math') {
                    let math = '';

                    if (course.name.title.includes('Statistics')) math = 'statistics';
                    if (course.name.title.includes('Calculus')) math = 'calculus';

                    reqNode = get(`.requirement-major .attribute.${math} .attribute-course`);
                }

                addRow(course, reqNode);
            }
        }

        /* ***** fill in summary section ***** */
        let reqTypes = ['gened', 'major', 'minor'];

        for (let type of reqTypes) {
            let filteredCourses = courses.filter(c => c.reqs.requirement.includes(type));
            let courseSubtotal = 0;
            let creditSubtotal = 0;

            for (let c of filteredCourses) {
                courseSubtotal += 1;
                creditSubtotal += c.credits;
            }

            // fill in subtotals
            let courseNode = get(`.requirement.courses .${type} .attribute-course`);
            let creditNode = get(`.requirement.credits .${type} .attribute-course`);

            courseNode.textContent = courseSubtotal;
            creditNode.textContent = creditSubtotal;
        }

        // fill in totals
        let courseNode = get(`.requirement.courses .total .attribute-course`);
        let creditNode = get(`.requirement.credits .total .attribute-course`);
        let notice = 'May be less than the sum of the numbers above due to overlap between requirements.';

        courseNode.textContent = courses.length; // don't count overlap between types
        courseNode.title = notice;
        creditNode.textContent = creditTotal;
        creditNode.title = notice;

        /* ***** add checkmark to filled tiles ***** */
        let tiles = getAll(':not(.section-summary) > .tile.requirement');

        for (let tile of tiles) {
            let attributes = getAll('.attribute-course', tile);
            let abort = false;

            for (let attribute of attributes) {
                if (attribute.textContent === '—') {
                    abort = true;
                    break;
                }
            }

            // skip this tile if it has an unfilled attribute
            if (abort === true) continue;

            // add checkmark if all requirements in this tile are filled
            let check = document.createElement('span');

            check.setAttribute('title', 'This section\'s requirements have been filled.');
            check.classList.add('icon', 'checkmark');
            get('h4', tile).appendChild(check);
        }

        function addRow(course, node) {
            // if attribute is already filled, skip and move to the next one
            while (node.textContent !== '—') {
                node = get('.attribute-course', node.parentNode.nextElementSibling);
            }

            node.textContent = course.name.shorthand;
            addTooltip(course, node);

            // on click, jump to course schedule and highlight the course
            node.classList.add('linked');
            node.addEventListener('click', function () {
                let clickedCourse = get('#' + course.name.id);
                let motion = (window.matchMedia('(prefers-reduced-motion)').matches) ? 'auto' : 'smooth';

                clickedCourse.closest('.semester').scrollIntoView({ behavior: motion });
                clickedCourse.classList.add('highlighted');
                get('.req-container', clickedCourse).classList.add('no-fade'); // .pill has an existing transition property that we don't want to appear when jumping to course
                window.setTimeout(function () {
                    get('.req-container', clickedCourse).classList.remove('no-fade');
                    clickedCourse.classList.remove('highlighted');
                    clickedCourse.classList.add('fade-out');
                }, 1500);
                window.setTimeout(function () {
                    clickedCourse.classList.remove('fade-out');
                }, 3500);
            }, false);
        }

        function addTooltip(course, node) {
            let tooltip = course.tooltip();

            node.appendChild(tooltip);
            ['mouseenter', 'touchstart'].forEach(event => {
                node.addEventListener(event, function () {
                    tooltip.classList.add('show');
                }, false);
            });
            ['mouseleave', 'touchend'].forEach(event => {
                node.addEventListener(event, function () {
                    tooltip.classList.remove('show');
                }, false);
            });

            // reposition tooltip if it goes offscreen
            // @TODO: make this update when window is resized
            let intersect = new IntersectionObserver(entries => {
                let entry = entries[0];

                if (entry.intersectionRatio < 1) {
                    let overflow = entry.intersectionRect.right - entry.boundingClientRect.right;

                    entry.target.style.left = overflow + 'px';
                    entry.target.style.setProperty('--arrow-pos', `calc(${-overflow}px + 3.5ch + .35em)`);
                }

                intersect.unobserve(tooltip);
            }, {
                root: get('body'), // not sure why it doesn't work without this
                rootMargin: '0px -15px 0px 0px'
            });

            // delay repositioning to fix tooltip randomly being more than 15px away
            // from right edge, possibly because DOM hasn't fully loaded
            window.setTimeout(function () {
                intersect.observe(tooltip);
            }, 500);
        }
    }

    // @TODO: use WCUPA "api"?
    //        <https://catalog.wcupa.edu/js/courseleaf.js>
    //        <https://catalog.wcupa.edu/ribbit/index.cgi?page=getcourse.rjs&code=CSC%20142>
    //        <https://stackoverflow.com/questions/5031501/how-to-rate-limit-ajax-requests>
    // @TODO: toggle switch for compact/expanded views
    //        - show/hide days of week with circles around letters
    //        - show/hide professor
    // @TODO: show weekly schedule below each semester (grid? SVG?)
    //        <https://css-tricks.com/building-a-conference-schedule-with-css-grid/>
    //        <https://codyhouse.co/demo/schedule-template/index.html>
    //        <https://cssgrid-generator.netlify.app>
    //        <https://stackoverflow.com/questions/22549505/>
    //        <https://treo.sh/demo/1/sites/1?sgi=1>
    //        <https://css-tricks.com/grid-auto-flow-css-grid-flex-direction-flexbox/>
    //                        FALL 2020
    //         SEMESTER 1 YEAR 1     SEMESTER 2 YEAR 1
    //        [   course list   ]   [   course list   ]
    //        [ hourly schedule ]   [ hourly schedule ]
    //
    //                       SPRING 2020
    //         SEMESTER 3 YEAR 2     SEMESTER 4 YEAR 2
    //        [   course list   ]   [   course list   ]
    //        [ hourly schedule ]   [ hourly schedule ]

    function buildSchedule(courses) {
        // starting year for "Fall 2020" headers; I know it's a bad name
        let semesterYear = 2020;

        // get list of year numbers (most likely 1, 2, 3, 4)
        let yearList = [];

        for (let course of courses) {
            if (yearList.includes(course.year) === false) yearList.push(course.year);
        }

        for (let year of yearList) {
            // create empty year section
            let yearNode = document.createElement('section');

            yearNode.classList.add('year');
            get('.course-schedule').appendChild(yearNode);

            // get list of semester numbers (most likely 1, 2) for given year
            let semList = [];

            for (let course of courses.filter(c => c.year === year)) {
                if (semList.includes(course.semester) === false) semList.push(course.semester);
            }

            // fill year with semesters
            for (let semester of semList) {
                // create empty semester section
                let semTemplate = get('.template-semester').content.cloneNode(true);
                let semHeader = get('.semester-num', semTemplate);
                let season = expandSemester(semester);
                let semCreditTotal = 0;

                semHeader.innerHTML = `Year ${year} <span class="subdued">${season} ${semesterYear}</span>`;
                if (semester === 1) semesterYear++;

                // fill semester with courses
                let courseList = courses
                                .filter(c => c.year === year)
                                .filter(c => c.semester === semester);

                for (let course of courseList) {
                    let courseTemplate = get('.template-course').content.cloneNode(true),
                        courseNode = get('.course', courseTemplate),
                        shortNode = get('.course-shorthand', courseTemplate),
                        shortNodeAlt = get('.course-shorthand-alt', courseTemplate),
                        titleNode = get('.course-name', courseTemplate),
                        reqContainer = get('.req-container', courseTemplate),
                        creditsNode = get('.course-credits', courseTemplate);

                    courseNode.id = course.name.id;
                    shortNode.textContent = course.name.shorthand;
                    shortNodeAlt.textContent = course.name.shorthand;
                    linkTitle(titleNode, course);
                    handlePill(reqContainer, course);
                    creditsNode.textContent = course.credits + ' cr.';
                    semCreditTotal += course.credits;
                    get('.semester', semTemplate).appendChild(courseTemplate);

                    // fade out overflowing pills
                    let reqObserver = new ResizeObserver(entry => {
                        let el = entry[0];

                        if (el.target.scrollWidth > el.target.offsetWidth) {
                            el.target.classList.add('fade-overflow');
                        } else if (el.target.classList.contains('fade-overflow')) {
                            el.target.classList.remove('fade-overflow');
                        }
                    });

                    reqObserver.observe(reqContainer);
                }

                // create semester total
                let semTotalTemplate = get('.template-total').content.cloneNode(true);
                let semTotalNode = get('.credit-total', semTotalTemplate);

                semTotalNode.textContent = semCreditTotal + ' cr.';
                get('.semester', semTemplate).appendChild(semTotalTemplate);

                yearNode.appendChild(semTemplate);
            }
        }

        function linkTitle(container, course) {
            let link = document.createElement('a');

            link.classList.add('course-link');
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
            link.setAttribute('title', `Open in course catalog on wcupa.edu`);
            link.href = `https://catalog.wcupa.edu/search/?P=${course.name.subject}+${course.name.number}`;
            link.textContent = course.name.title;
            container.appendChild(link);
        }

        function handlePill(container, course) {
            let requirement = course.reqs.requirement;
            let attribute = course.reqs.attribute;

            // if course meets multiple requirements
            // eg. CSC 301 is major and gen ed
            if (typeof requirement === 'object') {
                requirement.forEach((req, i) => {
                    buildPill(container, req, attribute[i]);
                });
            }
            // if course meets multiple attributes
            // eg. GEO 204 is i and j
            else if (typeof attribute === 'object') {
                attribute.forEach((attr, i) => {
                    if (i === 0) {
                        buildPill(container, requirement, attr);
                    }
                    // only add remaining attr, not a duplicate requirement + attr
                    // eg. GEO 204 would show [gened] [i] [j]
                    else {
                        buildPill(container, requirement, attr, true);
                    }
                });
            } else {
                buildPill(container, requirement, attribute);
            }

            function buildPill(container, req, attr, duplicate = false) {
                [req, attr].forEach(type => {
                    // skip duplicate requirements
                    if (!(type === req && duplicate === true)) {
                        let pill = document.createElement('button');
                        // separate attributes with the same name that appear in multiple reqs
                        // (eg. core in both major/minor) by making attr classes more specific
                        let typeClass = (type === attr) ? `${req}-${type}` : type;

                        pill.setAttribute('type', 'button');
                        pill.classList.add('pill', typeClass);
                        pill.textContent = expandAbbrev(type);
                        pill.addEventListener('click', function () {
                            // highlight courses with same req/attr, fade all others
                            if (this.classList.contains('selected') === false) {
                                clearSelected();

                                let years = getAll('.year');
                                let selectedPills = getAll('.pill.' + this.classList[1]);

                                for (let year of years) year.classList.add('filtered');

                                for (let pill of selectedPills) {
                                    pill.classList.add('selected');
                                    pill.closest('.course').classList.add('selected');
                                }
                            }
                            // if clicked pill is already selected, clear selection
                            else {
                                clearSelected();
                            }

                            function clearSelected() {
                                getAll('.selected').forEach(el => el.classList.remove('selected'));
                                getAll('.filtered').forEach(el => el.classList.remove('filtered'));
                            }
                        }, false);

                        container.appendChild(pill);
                    }
                });
            }
        }
    }

    function buildDeadlines() {
        let events = getAll('.event');

        for (let eventNode of events) {
            let time = get('.event-date', eventNode).dataset.time;
            let timeDiff = timeBetween(new Date(), new Date(time));
            let diffNode = document.createElement('div');

            diffNode.classList.add('event-diff', 'uppercase', 'monospace', 'subdued');
            get('.event-date', eventNode).appendChild(diffNode);

            // not a valid date
            if (Number.isNaN(timeDiff.days)) {
                // generally for registration dates in the future
                diffNode.textContent = `? days away`;
            }
            // today and tomorrow
            else if (timeDiff.days === 0) {
                // today's hours/minutes is negative because 00:00 - current time
                if (timeDiff.hours < 0 || timeDiff.minutes < 0) {
                    diffNode.textContent = 'today';
                } else {
                    diffNode.textContent = '1 day away';
                }
            }
            // date in the past
            else if (timeDiff.days < 0) {
                let days = (timeDiff.days === -1) ? 'day' : 'days';

                diffNode.textContent = `${Math.abs(timeDiff.days)} ${days} ago`;
                eventNode.classList.add('past');
            }
            // date in the future
            else {
                // add 1 day because function doesn't round up days + hours
                diffNode.textContent = `${timeDiff.days + 1} days away`;
            }

            if (eventNode.classList.contains('celebrate')) {
                eventNode.addEventListener('click', function () {
                    confetti.start(3000);
                }, false);
            }
        }

        // <https://stackoverflow.com/a/54616411>
        function timeBetween(startDate, endDate) {
            let delta = Math.abs(endDate - startDate) / 1000;
            const isNegative = startDate > endDate ? -1 : 1;

            return [
                ['days', 24 * 60 * 60],
                ['hours', 60 * 60],
                ['minutes', 60],
                ['seconds', 1]
            ].reduce((acc, [key, value]) => (acc[key] = Math.floor(delta / value) * isNegative, delta -= acc[key] * isNegative * value, acc), {});
        }
    }

    function expandAbbrev(abbrev) {
        switch (abbrev) {
            case 'gened':
                return 'Gen Ed';
            case 'fye':
                return 'First Year Experience';
            case 'social':
                return 'Behav. & Social Science';
            case 'math':
                return 'Mathematics';
            case 'english':
                return 'English Composition';
            case 'writing':
                return 'Writing Emphasis';
            case 'speaking':
                return 'Speaking Emphasis';
            case 'i':
                return 'Interdisciplinary';
            case 'j':
                return 'Diverse Communities';
            case 'complex':
                return 'Complex Large-Scale Systems';
            default:
                return capitalizeFirstLetter(abbrev);
        }

        function capitalizeFirstLetter(string) {
            return string[0].toUpperCase() + string.slice(1);
        }
    }

    function expandSemester(semester) {
        switch (semester) {
            case 1:
                return 'Fall';
            case 2:
                return 'Spring';
            case 3:
                return 'Summer';
            case 4:
                return 'Winter';
        }
    }

    function expandYear(year) {
        switch (year) {
            case 1:
                return 'Freshman';
            case 2:
                return 'Sophomore';
            case 3:
                return 'Junior';
            case 4:
                return 'Senior';
        }
    }

    fetchData();
    buildNavigation();
    buildDeadlines();
}());