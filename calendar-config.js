function calcTable(year) {

  // create year array 'arr' with 12 months
  let arr = new Array(12);
  for (let month = 0; month < arr.length; month++) {
    // each month, could span up to 6 weeks
    arr[month] = new Array(6);

    // each week, has 7 days
    for (let week = 0; week < arr[month].length; week++) {
      arr[month][week] = new Array(7);
    }

  }

  // for (let month = 0; month < arr.length; month++) {
  //   for (let week = 0; week < arr[month].length; week++) {
  //     arr[month][week] = new Array(7);
  //   }
  // }

  for (let month = 0; month < arr.length; month++) {
    let startDayInWeek = new Date(year, month, 0).getDay() + 1;
    
    let monthLong = new Date(year, month + 1,0).getDate() + 1;

    let beforeCount = 0;
    let counter = 1;

    let startCount = false;

    for (let week = 0; week < arr[month].length; week++) {
      for (let day = 0; day < arr[month][week].length; day++) {
        if (beforeCount == startDayInWeek) {
          startCount = true;
        } else {
          beforeCount++;
        }

        if (startCount == true) {
          arr[month][week][day] = counter;
          counter++;
        } else {
          arr[month][week][day] = "";
        }

        if (counter > monthLong) {
          arr[month][week][day] = "";
        }
        // console.log('month:', month+1, 'week:', week, 'day:', day, arr[month][week][day])
      }
      // console.log('month:', month+1, 'week:', week, arr[month][week])
    }
    // console.log('month:', month, arr[month])
  }
  return arr;
}
export default calcTable;