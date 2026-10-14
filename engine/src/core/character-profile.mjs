export function characterProfileFields(student){
 return [['성격','personality'],['배경','background'],['강점','strength'],['어려워하는 것','difficulty']].map(([label,key])=>[label,student.profile?.[key]??'미등록']);
}
