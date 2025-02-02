import icalendar
from pathlib import Path
from datetime import datetime, timedelta

ics_path = Path("./SUTD_Schedule.ics")
calendar = icalendar.Calendar.from_ical(ics_path.read_bytes())


def generate_weeks(day_of_first_event: datetime, last_day_of_event: datetime):
    # Adjust the first date to the Monday of its week.
    # weekday() returns 0 for Monday, 6 for Sunday.
    start_date = day_of_first_event - timedelta(days=day_of_first_event.weekday())

    # Adjust the last date to the Sunday of its week.
    # (6 - weekday()) gives the number of days to add to reach Sunday.
    end_date = last_day_of_event + timedelta(days=(6 - last_day_of_event.weekday()))

    nested_weeks = []
    current_date = start_date

    while current_date <= end_date:
        week = [current_date + timedelta(days=i) for i in range(7)]
        nested_weeks.append(week)
        current_date += timedelta(days=7)

    return nested_weeks

dates = sorted([event.get("DTSTART").dt for event in calendar.events])

day_of_first_event: datetime = dates[0]
last_day_of_event: datetime = dates[-1]

weeks = generate_weeks(
    day_of_first_event=day_of_first_event, last_day_of_event=last_day_of_event
)


# Create a new calendar
cal = icalendar.Calendar()
cal.add("prodid", "-//Google Inc//Google Calendar 70.9054//EN")
cal.add("version", "2.0")

for i, week in enumerate(weeks):
    first_day: datetime = week[0]
    last_day: datetime = week[-1]

    event = icalendar.Event()
    event.add("summary", f"Week {i+1}")
    event.add("dtstart", first_day.date())
    event.add("dtend", last_day.date())
    
    event.add('X-APPLE-CALENDAR-COLOR', '#FF0000')

    cal.add_component(event)

with open("sutd_term_weeks.ics", "wb") as f:
    f.write(cal.to_ical())

print("ICS file created")
