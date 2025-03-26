// BOJ - 1463

#include <stdio.h>
#define INF 987654321

int min(int a,int b)
{
	return a<b?a:b;
}
int main()
{
	int n;
	scanf("%d",&n);
	int dp[n+1]={0};
	for(int i=2; i<=n; i++)
	{
		int cmp1=INF,cmp2=INF,cmp3=INF;
		if(i%3==0) cmp1=dp[i/3]+1;
		if(i%2==0) cmp2=dp[i/2]+1;
		cmp3=dp[i-1]+1;
		dp[i]=min(min(cmp1,cmp2),cmp3);
	}
	printf("%d",dp[n]);
}