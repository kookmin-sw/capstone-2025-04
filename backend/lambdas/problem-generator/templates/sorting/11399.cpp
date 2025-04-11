#include <iostream>
#include <algorithm>

using namespace std;

int main()
{
	int n;
	cin >> n;
	int d[n];
	for(int i=0; i<n; i++)
		cin >> d[i];
	sort(d,d+n);
	int sum=0,i=0;
	for(;i<n;sum+=(n-i)*d[i],i++);
	cout << sum;
}