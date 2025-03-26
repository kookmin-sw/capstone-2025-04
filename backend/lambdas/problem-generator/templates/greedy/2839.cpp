// BOJ - 2839

#include <stdio.h>
#define INF 987654321
int min(int a,int b)
{
	return a<b?a:b;
}
int main()
{
	int N;
	scanf("%d",&N);
	int ans=INF;
	for(int x=0; x<=N/3; x++)
		if((N-x*3)/5*5+3*x==N)
			ans=min(ans,x+(N-x*3)/5);
	printf("%d",ans==INF?-1:ans);
}