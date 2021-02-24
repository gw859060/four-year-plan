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
                fetch(base + file).then(response => {
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
                        warning.addEventListener('click', () => { window.location.reload(); });
                        get('main').appendChild(warning);
                    }

                    console.error(error);
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

        // anything with dates (standard four-year sequence)
        for (let year of json.years) {
            for (let semester of year.semesters) {
                for (let course of semester.courses) {
                    let obj = new Course(
                        course.subject,
                        course.number,
                        course.name,
                        course.requirement,
                        course.attribute,
                        course.credits,
                        course.times,
                        year.year,
                        semester.semester
                    );

                    courseObjects.push(obj);
                }
            }
        }

        // anything without dates (AP credit, etc)
        for (let course of json.other) {
            let obj = new Course(
                course.subject,
                course.number,
                course.name,
                course.requirement,
                course.attribute,
                course.credits,
                -1 // can't use undefined - courses without times that will eventually be assigned
                   // times in the future (ie. in upcoming semesters) already use undefined
            );

            courseObjects.push(obj);
        }

        return courseObjects;
    }

    function Course(subject, number, title, requirement, attribute, credits, times, year, semester) {
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
        this.times = times;
        this.year = year;
        this.semester = semester;
        this.tooltip = function () {
            let tooltip = document.createElement('div');
            let header = document.createElement('div');
            let details = document.createElement('div');

            header.classList.add('tooltip-title');
            header.textContent = this.name.shorthand + ': ' + this.name.title;

            // don't add year/semester for courses without dates (eg. AP credit)
            if (this.times !== -1) {
                let yearDiff = (this.semester === 1 || this.semester === 4) ? this.year - 1 : this.year;

                details.classList.add('tooltip-details');
                details.textContent = `${expandYear(this.year)} Year • ${expandSemester(this.semester)} ${2020 + yearDiff}`;
            }

            tooltip.classList.add('tooltip', 'tile', 'dark');
            tooltip.appendChild(header);
            tooltip.appendChild(details);

            return tooltip;
        };
    }

    function buildNavigation() {
        let nav = get('nav');
        let links = getAll('.nav-link');

        for (let link of links) {
            link.addEventListener('click', function () {
                let section = link.dataset.section;
                let motion = (window.matchMedia('(prefers-reduced-motion)').matches) ? 'auto' : 'smooth';

                get('.' + section).scrollIntoView({ behavior: motion });
                // scrollStop() goes here, maybe
            }, false);
        }

        // add transition-delay values to nav items
        let delay = 100;

        getAll('.nav-item').forEach(item => {
            item.style.transitionDelay = delay + 'ms';
            delay += 100;
        });

        // handle opening/closing nav via menu button
        get('.nav-button').addEventListener('click', function (event) {
            // if open, close nav
            if (nav.classList.contains('show-menu')) {
                nav.classList.remove('show-menu');
                this.setAttribute('aria-expanded', false);
            }
            // if closed, open nav
            else {
                nav.classList.add('show-menu');
                this.setAttribute('aria-expanded', true);

                nav.addEventListener('keydown', function (event) {
                    // close nav when Esc is pressed
                    if (event.key === 'Escape') nav.classList.remove('show-menu');

                    // @TODO: move focus between items with arrow keys
                    // <https://www.smashingmagazine.com/2017/11/building-accessible-menu-systems/>
                    // § "Keyboard And Focus Behavior"
                }, { passive: true });

                // close nav when focus leaves it or its children (eg. by tabbing out)
                nav.addEventListener('focusout', function (event) {
                    // if newly focused element is still in nav, ignore the event
                    if (nav.contains(event.relatedTarget)) return;

                    nav.classList.remove('show-menu');
                }, { passive: true });

                // click outside nav to close
                document.addEventListener('click', function clickOutside(event) {
                    if (!event.target.closest('nav')) {
                        nav.classList.remove('show-menu');
                        document.removeEventListener('click', clickOutside, { passive: true });
                    }
                }, { passive: true });
            }
        }, { passive: true });
    }

    function buildRequirements(json) {
        /* ***** gen eds ***** */
        let geneds = json.gened[0];
        let genedTypes = ['academic', 'distributive', 'additional'];

        for (let type of genedTypes) {
            geneds[type].forEach((attr, i) => {
                let parentNode = get('.section-gened .' + type);

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
                    let reqNode = get(`.section-${req} .attribute.${attribute[i]} .attribute-course`);

                    addRow(course, reqNode);
                });
            }
            // if course meets multiple attributes
            // eg. GEO 204 is interdisciplinary and diverse communities
            else if (typeof attribute === 'object') {
                attribute.forEach(attr => {
                    let reqNode = get(`.section-${requirement} .attribute.${attr} .attribute-course`);

                    addRow(course, reqNode);
                });
            }
            // otherwise course has a single requirement/attribute pair
            else {
                let reqNode = get(`.section-${requirement} .attribute.${attribute} .attribute-course`);

                // handle math separately to allow them to keep the same pill text
                if (requirement === 'major' && attribute === 'math') {
                    let math;

                    if (course.name.title.includes('Statistics')) math = 'statistics';
                    if (course.name.title.includes('Calculus')) math = 'calculus';

                    reqNode = get(`.section-major .attribute.${math} .attribute-course`);
                }

                addRow(course, reqNode);
            }
        }

        /* ***** fill in summary section ***** */
        // @TODO: fun stats?
        //     - "your busiest day of the week"
        //     - first semester date, last semester date
        //     - most common/second most common department taken
        //
        // let reqTypes = ['gened', 'major', 'minor'];
        //
        // for (let type of reqTypes) {
        //     let filteredCourses = courses.filter(c => c.reqs.requirement.includes(type));
        //     let courseSubtotal = 0;
        //     let creditSubtotal = 0;
        //
        //     for (let c of filteredCourses) {
        //         courseSubtotal += 1;
        //         creditSubtotal += c.credits;
        //     }
        //
        //     // fill in subtotals
        //     let courseNode = get(`.requirement.courses .${type} .attribute-course`);
        //     let creditNode = get(`.requirement.credits .${type} .attribute-course`);
        //
        //     courseNode.textContent = courseSubtotal;
        //     creditNode.textContent = creditSubtotal;
        // }
        //
        // // fill in totals
        // let courseNode = get(`.requirement.courses .total .attribute-course`);
        // let creditNode = get(`.requirement.credits .total .attribute-course`);
        // let notice = 'May be less than the sum of the numbers above due to overlap between requirements.';
        //
        // courseNode.textContent = courses.length; // don't count overlap between types
        // courseNode.title = notice;
        // creditNode.textContent = creditTotal;
        // creditNode.title = notice;

        /* ***** add checkmark to filled tiles ***** */
        // let tiles = getAll(':not(.section-summary) > .tile.requirement');
        //
        // for (let tile of tiles) {
        //     let attributes = getAll('.attribute-course', tile);
        //     let abort = false;
        //
        //     for (let attribute of attributes) {
        //         if (attribute.textContent === '—') {
        //             abort = true;
        //             break;
        //         }
        //     }
        //
        //     // skip this tile if it has an unfilled attribute
        //     if (abort === true) continue;
        //
        //     // add checkmark if all requirements in this tile are filled
        //     let check = document.createElement('span');
        //
        //     check.setAttribute('title', 'This section\'s requirements have been filled.');
        //     check.classList.add('icon', 'checkmark');
        //     get('h4', tile).appendChild(check);
        // }

        function addRow(course, node) {
            // if attribute is already filled, skip and move to the next one
            while (node.textContent !== '—') {
                node = get('.attribute-course', node.parentNode.nextElementSibling);
            }

            // replace div with button so empty courses are skipped when tabbing through
            let button = document.createElement('button');

            button.classList.add('attribute-course', 'monospace', 'uppercase', 'linked');
            button.textContent = course.name.shorthand;
            button.setAttribute('type', 'button');
            addTooltip(course, button);
            node.parentNode.appendChild(button);
            node.remove();

            // on click, jump to course schedule and highlight the course
            button.addEventListener('click', function () {
                let clickedCourse = get('#' + course.name.id);
                let motion = (window.matchMedia('(prefers-reduced-motion)').matches) ? 'auto' : 'smooth';

                clickedCourse.classList.add('highlighted');
                // disable existing transition property on .pill when jumping to course
                get('.req-container', clickedCourse).classList.add('no-fade');

                // <https://css-tricks.com/smooth-scrolling-accessibility/>
                // the problem: setting focus as instructed makes the browser jump
                // to target immediately, skipping the smooth scroll behavior
                get('.semester-num', clickedCourse.parentNode).scrollIntoView({ behavior: motion });
                // scrollStop(function () { get('.pill', clickedCourse).focus(); });

                window.setTimeout(function () {
                    get('.req-container', clickedCourse).classList.remove('no-fade');
                    clickedCourse.classList.remove('highlighted');
                    clickedCourse.classList.add('fade-out');
                }, 1500);

                window.setTimeout(function () {
                    clickedCourse.classList.remove('fade-out');
                }, 3000);
            }, false);
        }

        function addTooltip(course, attrNode) {
            let tooltip = course.tooltip();

            ['mouseenter', 'touchstart', 'focus'].forEach(event => {
                attrNode.addEventListener(event, function (e) {
                    e.currentTarget.appendChild(tooltip);
                    repositionTooltip(tooltip);
                }, { passive: true });
            });

            ['mouseleave', 'touchend', 'blur'].forEach(event => {
                attrNode.addEventListener(event, function (e) {
                    if (e.currentTarget.contains(tooltip)) {
                        e.currentTarget.removeChild(tooltip);
                    }
                }, { passive: true });
            });
        }
    }

    // @TODO: use WCUPA "api"?
    //        <https://catalog.wcupa.edu/js/courseleaf.js>
    //        <https://catalog.wcupa.edu/ribbit/index.cgi?page=getcourse.rjs&code=CSC%20142>
    //        <https://stackoverflow.com/questions/5031501/how-to-rate-limit-ajax-requests>
    // @TODO: toggle switch for compact/expanded (detailed) views
    //        - show/hide days of week with circles around letters
    //        - show/hide professor
    //        <https://codyhouse.co/demo/schedule-template/index.html>
    //        <https://css-tricks.com/grid-auto-flow-css-grid-flex-direction-flexbox/>

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
                let courseIndex = 0;
                let courseList = courses.filter(c => c.year === year).filter(c => c.semester === semester);

                // do not create DOM elements for courses without dates (eg. AP credits)
                if (courseList[0].times === -1) return;

                // create empty semester section
                let semTemplate = get('.template-semester').content.cloneNode(true),
                    semNode = get('.semester', semTemplate),
                    semHeader = get('.semester-num', semTemplate),
                    season = expandSemester(semester),
                    semCreditTotal = 0;

                semNode.style.gridArea = expandSemester(semester).toLowerCase();
                semHeader.innerHTML = `Year ${year} <span class="subdued">${season} ${semesterYear}</span>`;
                if (semester === 1) semesterYear++;

                // only add row-gap if there are summer/winter semesters; if the gap is constantly "on",
                // it creates inconsistent spacing because the gap doesn't hide when there is no second row
                if (semester === 3 || semester === 4) yearNode.style.rowGap = '3em';

                // fill semester with courses
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
                    shortNodeAlt.textContent = course.name.shorthand + ' ';
                    linkTitle(titleNode, course);
                    handlePill(reqContainer, course);
                    handleTimes(semNode, course, courseIndex);
                    creditsNode.textContent = course.credits + ' cr.';
                    semCreditTotal += course.credits;
                    semNode.appendChild(courseTemplate);
                    courseIndex++;

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

                // move weekly schedule to the end (originally placed after first class with time data)
                if (get('.weekly-schedule', semNode)) semNode.appendChild(get('.weekly-schedule', semNode));

                yearNode.appendChild(semTemplate);
            }
        }

        // handle keyboard accessibility for pills
        getAll('.req-container').forEach(container => {
            container.focus = 0;
            container.elements = getAll('.pill', container);
            container.elements[0].setAttribute('tabindex', 0); // all pills are initially set to -1
            container.addEventListener('keydown', makeAccessible);
        });

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

                        pill.classList.add('pill', typeClass);
                        pill.textContent = expandAbbrev(type);
                        pill.setAttribute('type', 'button');
                        pill.setAttribute('tabindex', '-1');
                        pill.addEventListener('click', function () {
                            // highlight courses with same req/attr, fade all others
                            // @TODO: use objects to do this instead of DOM
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

        function handleTimes(container, course, index) {
            let times = course.times;

            // ignore classes without time data
            if (typeof times === 'object') {
                let backgrounds = ['bg-red', 'bg-orange', 'bg-green', 'bg-blue', 'bg-purple'];

                // if weekly schedule has not been created yet
                // @TODO: dynamically create hour numbers and reduce them to the minimum necessary
                if (!get('.weekly-schedule', container)) {
                    let weekTemplate = get('.template-week').content.cloneNode(true);
                    let rowNum = 1;

                    container.appendChild(weekTemplate);

                    // insert rows to create hourly grid lines (currently showing 7 hours)
                    for (let i = 1; i <= 7; i++) {
                        let hourLine = document.createElement('div');

                        hourLine.classList.add('hour-line', 'unselectable');
                        hourLine.style.gridRow = rowNum + ' / ' + (rowNum + 12);
                        get('.week-grid', container).appendChild(hourLine);

                        rowNum += 12;
                    }

                    // open/collapse week schedule on click
                    let button = get('.week-button', container);

                    button.addEventListener('click', function () {
                        // schedule is in expanded state (default)
                        if (button.dataset.collapse === 'expanded') {
                            for (let button of getAll('.week-button')) {
                                button.textContent = 'Expand week view ↓';
                                button.dataset.collapse = 'collapsed';
                            }

                            for (let week of getAll('.weekly-schedule')) {
                                week.classList.add('collapsed');
                            }
                        }
                        // schedule is in collapsed state
                        else {
                            for (let button of getAll('.week-button')) {
                                button.textContent = 'Collapse week view ↑';
                                button.dataset.collapse = 'expanded';
                            }

                            for (let week of getAll('.weekly-schedule')) {
                                week.classList.remove('collapsed');
                            }
                        }
                    }, false);
                }

                // add time slots for this course to the grid
                for (let time of times) {
                    let courseSlot = document.createElement('div');

                    courseSlot.setAttribute('tabindex', '0');
                    courseSlot.classList.add('course-slot', 'monospace', 'uppercase', backgrounds[index]);
                    courseSlot.textContent = course.name.shorthand;
                    courseSlot.style.gridRow = convertToRow(time.start) + '/' + convertToRow(time.end);
                    courseSlot.style.gridColumn = convertToColumn(time.day);
                    addTooltip(courseSlot, course, time);

                    get('.week-grid', container).appendChild(courseSlot);
                }
            }

            function addTooltip(courseSlot, course, time) {
                let tooltip = buildTooltip(course, time);

                ['mouseenter', 'touchstart', 'focus'].forEach(event => {
                    courseSlot.addEventListener(event, function (e) {
                        e.currentTarget.appendChild(tooltip);
                        repositionTooltip(tooltip);
                    }, { passive: true });
                });

                ['mouseleave', 'touchend', 'blur'].forEach(event => {
                    courseSlot.addEventListener(event, function (e) {
                        // some weird interaction where clicking slot and then clicking away produces error
                        if (e.currentTarget.contains(tooltip)) {
                            e.currentTarget.removeChild(tooltip);
                        }
                    }, { passive: true });
                });

                function buildTooltip(course, time) {
                    let tooltip = document.createElement('div');

                    tooltip.classList.add('tooltip', 'tile', 'dark');
                    tooltip.setAttribute('role', 'tooltip');

                    let header = document.createElement('div');

                    header.classList.add('tooltip-title');
                    header.textContent = course.name.shorthand + ': ' + course.name.title;
                    tooltip.appendChild(header);

                    let details = document.createElement('div'),
                        minutes = ((convertToRow(time.end) - convertToRow(time.start)) * 5),
                        hours = Math.floor(minutes / 60);

                    (hours !== 0) ? hours += 'h ' : hours = '';

                    // convert 24-hour time to 12-hour time
                    let startHour = time.start.split(':')[0],
                        startMin = time.start.split(':')[1],
                        endHour = time.end.split(':')[0],
                        endMin = time.end.split(':')[1];

                    if (startHour > 12) startHour -= 12;
                    if (endHour > 12) endHour -= 12;

                    let newStart = `${startHour}:${startMin}`,
                        newEnd = `${endHour}:${endMin}`;

                    details.classList.add('tooltip-details');
                    details.textContent = `${newStart}–${newEnd} • ${hours}${minutes % 60}m`;
                    tooltip.appendChild(details);

                    return tooltip;
                }
            }

            function convertToRow(time) {
                let timeSplit = time.split(':'),
                    hour = timeSplit[0],
                    min = timeSplit[1],
                    gridStartHour = 9; // 9am

                // convert course start/end time to its number of 5-minute intervals for grid placement;
                // add 1 because grid line naming starts at 1, not 0
                let rowNum = ((hour - gridStartHour) * 12 + 1) + (min / 5);

                return rowNum;
            }

            function convertToColumn(day) {
                switch (day) {
                    case 'M':
                        return 1;
                    case 'T':
                        return 2;
                    case 'W':
                        return 3;
                    case 'R':
                        return 4;
                    case 'F':
                        return 5;
                }
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
                // purposely done for unknown registration dates in the future
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

    function makeAccessible(event) {
        let target = event.currentTarget,
            elements = target.elements,
            key = event.key;

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            event.preventDefault(); // stop page from scrolling with arrow keys
            elements[target.focus].setAttribute('tabindex', -1);

            // move to next element
            if (['ArrowDown', 'ArrowRight'].includes(key)) {
                target.focus++;

                // if at the end, move to the start
                if (target.focus >= elements.length) {
                    target.focus = 0;
                }
            }
            // move to previous element
            else if (['ArrowUp', 'ArrowLeft'].includes(key)) {
                target.focus--;

                // if at the start, move to the end
                if (target.focus < 0) {
                    target.focus = elements.length - 1;
                }
            }

            elements[target.focus].setAttribute('tabindex', 0);
            elements[target.focus].focus();
        }
    }

    // <https://gomakethings.com/detecting-when-a-visitor-has-stopped-scrolling-with-vanilla-javascript/>
    function scrollStop(callback) {
        let isScrolling;

        window.addEventListener('scroll', function (event) {
            window.clearTimeout(isScrolling);

            isScrolling = setTimeout(function () {
                callback();
            }, 66);
        }, { passive: true });
    }

    function repositionTooltip(tooltip) {
        let parentWidth = tooltip.parentNode.offsetWidth;
        let padLeft = parseFloat(window.getComputedStyle(tooltip).getPropertyValue('padding-left'));
        let intersect = new IntersectionObserver(entries => {
            let entry = entries[0];
            let overflow = 0;

            if (entry.intersectionRatio < 1) {
                overflow = entry.intersectionRect.right - entry.boundingClientRect.right;
            }

            // move tooltip body while keeping arrow centered over hovered element
            // @TODO: fix tooltip "jumping" when it appears on Chrome and Firefox
            let arrowPos = (overflow * -1) + (parentWidth / 2) - (padLeft / 2);

            entry.target.style.left = overflow + 'px';
            entry.target.style.setProperty('--arrow-pos', arrowPos + 'px');
        }, { rootMargin: '0px -15px 0px 0px' });

        intersect.observe(tooltip);
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
                // capitalize first letter
                return abbrev[0].toUpperCase() + abbrev.slice(1);
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