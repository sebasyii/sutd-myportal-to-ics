(function () {
    const formatString = (str) =>
        str?.replace(/\s+/g, ' ').replace(/\n/g, '').trim();

    const parseDateStr = (ddmmyyyy) => {
        const [d, m, y] = ddmmyyyy.split('/');
        return new Date(Date.UTC(+y, +m - 1, +d));
    };

    const generateUID = (title, date, time) => {
        const str = `${title}-${date}-${time}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash &= hash;
        }
        return `${Math.abs(hash).toString(16)}-${Date.now()}@sutd.edu.sg`;
    };

    const formatDateTime = (date, time, useUTC = false) => {
        if (!time) {
            console.warn(`Time is missing for date: ${date}`);
            return null;
        }
        const timeRegex = /^(\d{1,2}):(\d{2})\s?(AM|PM)?$/i;
        const match = time.match(timeRegex);
        if (!match) {
            throw new Error(`Invalid time format: ${time}`);
        }
        let [_, hours, minutes, period] = match;
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        if (period) {
            if (period.toUpperCase() === 'PM' && hours !== 12) {
                hours += 12;
            } else if (period.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }
        }
        const newDate = new Date(date);
        if (useUTC) {
            newDate.setUTCHours(hours - 8, minutes, 0, 0);
            return newDate.toISOString()
                .replace(/[-:]/g, '')
                .replace(/\.\d{3}Z$/, 'Z');
        } else {
            newDate.setHours(hours, minutes, 0, 0);
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const day = String(newDate.getDate()).padStart(2, '0');
            const hour = String(hours).padStart(2, '0');
            const minute = String(minutes).padStart(2, '0');
            return `${year}${month}${day}T${hour}${minute}00`;
        }
    };

    const fixParenthesis = (str) => {
        return str.includes('(') && !str.includes(')') ? str + ')' : str;
    }

    const createEvent = ({
        uid,
        dtstamp,
        dtstart,
        dtend,
        title,
        location,
        instructor,
        eventType,
        rrule,
        withAlarm = true
    }) => {
        const summary = eventType ? `${title} (${eventType})` : title;
        const alarmDescription = `Reminder: ${summary}`;
        const lines = [
            'BEGIN:VEVENT',
            'SEQUENCE:0',
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            dtstart ? `DTSTART;TZID=Asia/Singapore:${dtstart}` : '',
            dtend ? `DTEND;TZID=Asia/Singapore:${dtend}` : '',
            `SUMMARY:${summary}`,
            `LOCATION:${location}`,
            `DESCRIPTION:Instructor(s): ${instructor}`,
            rrule ? `RRULE:${rrule}` : ''
        ];
        if (withAlarm) {
            lines.push(
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                `DESCRIPTION:${alarmDescription}`,
                'TRIGGER:-PT1H',
                'END:VALARM'
            );
        }
        lines.push('END:VEVENT');
        return lines.filter(Boolean).join('\r\n');
    };

    try {
        const iframe = document.getElementById('ptifrmtgtframe');
        if (!iframe) {
            throw new Error('Iframe not found with ID "ptifrmtgtframe".');
        }
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDocument) {
            throw new Error('Unable to access the iframe content. It might be cross-origin.');
        }
        console.log('Iframe content accessed successfully!');
        const targetElement = iframeDocument.getElementById('ACE_STDNT_ENRL_SSV2$0');
        if (!targetElement) {
            throw new Error('Element with ID "ACE_STDNT_ENRL_SSV2$0" not found in iframe.');
        }
        console.log('Element with ID "ACE_STDNT_ENRL_SSV2$0" found in iframe.');
        const elements = iframeDocument.querySelectorAll('[id^="win0divDERIVED_REGFRM1_DESCR20$"]');
        let events = [];
        elements.forEach((element, index) => {
            const titleElement = element.querySelector('.PAGROUPDIVIDER');
            let formattedTitle = '';
            if (titleElement) {
                const rawTitle = titleElement.textContent.trim();
                if (rawTitle.includes('.')) {
                    formattedTitle = rawTitle.slice(0, rawTitle.indexOf('.') - 1) +
                        rawTitle.slice(rawTitle.indexOf('.'));
                } else {
                    formattedTitle = rawTitle;
                }
            } else {
                console.error('Child element with class "PAGROUPDIVIDER" not found.');
            }
            const classMtgElementId = `CLASS_MTG_VW$scroll$${index}`;
            const classMtgElement = iframeDocument.getElementById(classMtgElementId);
            if (!classMtgElement) {
                console.error(`Element with ID "${classMtgElementId}" not found.`);
                return;
            }
            const contentRows = classMtgElement.querySelectorAll(
                'table.PSLEVEL3GRID>tbody>tr[id^="trCLASS_MTG_"]'
            );
            let currentEventType = null;
            Array.from(contentRows).forEach((row) => {
                const cells = [...row.children];
                const component = formatString(cells[2].textContent);
                const days_time = formatString(cells[3].textContent);
                const location = fixParenthesis(formatString(cells[4].textContent));
                const instructor = formatString(cells[5].textContent);
                const period = formatString(cells[6].textContent);
                if (component) {
                    if (component.includes('CBL')) {
                        currentEventType = 'CBL';
                    } else if (component.includes('Lecture')) {
                        currentEventType = 'Lecture';
                    }
                }
                const [periodStart, periodEnd] = period.split(' - ').map(parseDateStr);
                const [day, ...rest] = days_time.split(' ');
                const [startTimeRaw, endTimeRaw] = rest.join(' ').split(' - ');
                const startTime = startTimeRaw || null;
                const endTime = endTimeRaw || null;
                const uid = generateUID(formattedTitle, periodStart.toISOString(), startTime);
                const now = new Date();
                const dtstamp = formatDateTime(now, `${now.getHours()}:${now.getMinutes()}`, true);
                if (!startTime || !endTime) {
                    const dtstart = formatDateTime(periodStart, '00:00');
                    const dtend = formatDateTime(periodEnd, '23:59');
                    events.push(createEvent({
                        uid,
                        dtstamp,
                        dtstart,
                        dtend,
                        title: formattedTitle,
                        location,
                        instructor,
                        eventType: component,
                        withAlarm: false
                    }));
                } else {
                    if (periodStart.getTime() !== periodEnd.getTime()) {
                        const recurrenceDays = {
                            Mo: 'MO',
                            Tu: 'TU',
                            We: 'WE',
                            Th: 'TH',
                            Fr: 'FR',
                            Sa: 'SA',
                            Su: 'SU'
                        };
                        const dtstart = formatDateTime(periodStart, startTime);
                        const dtend = formatDateTime(periodStart, endTime);
                        const until = formatDateTime(periodEnd, '23:59', true);
                        const byDay = recurrenceDays[day] || 'MO';
                        const rrule = `FREQ=WEEKLY;UNTIL=${until};BYDAY=${byDay}`;
                        events.push(createEvent({
                            uid,
                            dtstamp,
                            dtstart,
                            dtend,
                            title: formattedTitle,
                            location,
                            instructor,
                            eventType: component,
                            rrule
                        }));
                    } else {
                        const dtstart = formatDateTime(periodStart, startTime);
                        const dtend = formatDateTime(periodStart, endTime);
                        events.push(createEvent({
                            uid,
                            dtstamp,
                            dtstart,
                            dtend,
                            title: formattedTitle,
                            location,
                            instructor,
                            eventType: component
                        }));
                    }
                }
            });
        });
        const headerLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SUTD//Schedule Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:SUTD Schedule',
            'X-WR-CALDESC:Automatically generated schedule from MyPortal',
            'X-WR-TIMEZONE:Asia/Singapore',
            'BEGIN:VTIMEZONE',
            'TZID:Asia/Singapore',
            'BEGIN:STANDARD',
            'DTSTART:19700101T000000',
            'TZOFFSETFROM:+0800',
            'TZOFFSETTO:+0800',
            'END:STANDARD',
            'END:VTIMEZONE'
        ];
        const body = events.join('\r\n');
        const footerLines = [
            'END:VCALENDAR'
        ];
        const icsContent = [
            ...headerLines,
            body,
            ...footerLines
        ].join('\r\n');
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'SUTD_Schedule.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('ICS file generation complete.');
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
})();