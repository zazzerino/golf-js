// export function zip(array0, array1) {
//   return array0.map((elem, i) => {
//     return [elem, array1[i]];
//   });
// }

export function rotate(arr, n) {
  const copy = [...arr];

  while (n > 0) {
    copy.push(copy.shift());
    --n;
  }

  return copy;
}
