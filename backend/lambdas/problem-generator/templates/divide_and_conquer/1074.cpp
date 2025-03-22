//
//       1074번 Z 
//

// 이 문제는 분할정복 문제 , 4분탐색 문제이다.

// 나도 처음 풀어보는 분할정복 문제이다.

// 재귀함수로 한번 풀어보겠다.

#include <iostream>
#include <cmath>

using namespace std;

int f(int ori_size,int row,int col)
{
	if(ori_size==4)
	{
		// 2*2 만 남은 경우 는 row 와 col 의 범위가 0 또는 1 이다. 
		// 그리고 공식을 제작하면 2*row+col 이다. 
		return 2*row+col; 
	}
	int four_divided_size = ori_size / 4;
	// four_divided_size 는 무엇이냐!
	
	// 먄약 제 3 사분면에 위치하면 제 1 사분면과 제 2 사분면은 지나가게 된 것입니다.
	 
	// 그러면 그 사분면을 더하고 축소시키면서 재귀 호출을 한다!
	
	// 그러기 위해서 four_divided_size 를 미리 구해놨다.
	
	int side_length_half = sqrt(ori_size) / 2;
	
	// side_length_half 는 한변의 길이의 반 이다. 
	
	// 그럼 이걸 왜 구했냐!
	
	// side_length_half 를 row 와 col 에 나눔으로써 1 0 으로 나뉘게 되고
	
	// 그것을 통해 사분면을 정할 수 있다.
	
	// 그리고 재귀함수 호출할때 축소할 때 쓴다. 
	
	int dr= row / side_length_half;
	int dc= col / side_length_half;
	
	// dr|dc 로 봤을때 0|0이면 제2사분면
	//                 0|1이면 제1사분면
	//                 1|0이면 제3사분면
	//                 1|1이면 제4사분면
	
	if(dr & dc) // 제 4 사분면! 제 2 사분면-> 제 1 사분면 -> 제 3사분면 -> 제 4사분면 
	{
		return four_divided_size*3+f(four_divided_size,row-side_length_half,col-side_length_half);
	} 
	else if(dr) // 제 3 사분면!
	{
		return four_divided_size*2+f(four_divided_size,row-side_length_half,col);
	} 
	else if(dc) // 제 1 사분면!
	{
		return four_divided_size*1+f(four_divided_size,row,col-side_length_half);
	} 
	else
	{
		return f(four_divided_size,row,col);
	}
}
int main() 
{
	int n,r,c;
	scanf("%d %d %d",&n,&r,&c);
	
	int t = 1 << n;
	// 1 << n = 2의 n승
	
	cout << f(t*t,r,c); 
}