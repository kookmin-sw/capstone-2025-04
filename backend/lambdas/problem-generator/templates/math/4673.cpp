 
#include <stdio.h>
#define N 10001 //배열 arr[1 ~ 10000] 까지 이므로 10001.
 
int arr[N]={0,};
 
//셀프넘버 판별 함수.
int solution(int n){
    int sum = n;    //자기 자신을 먼저 더해주고
 
    while(1){   // 각 자리수의 숫자를 더해야하므로 1의 자리를 계속 더해준다.
 
        if(n == 0) break; //0이 되면 break
        sum += n%10;      //1의 자리 더해주기
        n = n/10;         //한자리씩 없애기
 
    }
 
    return sum;
}
 
 
int main(void){
 
    for(int i=1; i<N; i++){
        int idx = solution(i);
 
        if(idx <= N){
            arr[idx] = 1; 
        }
 
    }
 
    for(int i=1; i<N; i++){
        if(!arr[i]) printf("%d\n", i);
    }
 
    return 0;
}