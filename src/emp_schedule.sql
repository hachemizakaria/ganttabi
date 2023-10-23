/*
 script used to create table emp_schedule

*/
drop  table emp_schedule cascade constraints;
/
 CREATE TABLE emp_schedule
   (	"N" NUMBER, 
	"EMPNO" NUMBER(4,0) NOT NULL ENABLE, 
	"ENAME" VARCHAR2(50) , 
	"D" DATE, 
	"SHIFT" NUMBER, 
	"H_START" DATE
   ) 
    ;
/
truncate table emp_schedule;
/
insert into  emp_schedule 
with e as (select 
    rownum -1 n,
    empno,
    ename
    
from emp where job = 'SALESMAN')
, s as (select 
    (level-1) shift ,
    case when (level-1) != 0 
        then NUMTODSINTERVAL(5,'hour') + (NUMTODSINTERVAL(8,'hour') * (level-1-1)) 
    end i_start
from dual connect by (level-1) <=3)
, d as (
select 
    level n,
    trunc(sysdate)+(level-1) d
from dual 
connect by level <=7)
, ed as (
select 
    e.n,
    e.empno,
    e.ename,
    d.d,
    mod(e.n + (d.n-1),4) r
from e, d 
order by d.n , e.n)
select
    ed.n,
    ed.empno,
    ed.ename,
    ed.d,
    nullif(s.shift,0) shift,
    ed.d + s.i_start h_start
from ed inner join  s on (ed.r= s.shift)
where s.shift !=0
;


