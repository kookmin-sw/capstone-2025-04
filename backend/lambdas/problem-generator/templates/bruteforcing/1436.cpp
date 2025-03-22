// BOJ - 1436 영화감독 숌

#include <iostream>
#include <string>

using namespace std;

bool chk(int n)
{
    string sn = to_string(n);
    int cnt = 0;
    for(int i = 0; i < sn.size(); i++)
    {
        if(sn[i] == '6') cnt++;
        else cnt = 0;
        if(cnt >= 3) return true;
    }
    return false;
}
int main()
{
    int n; cin >> n;

    int i, res = 0;
    for(i = 666; res != n; i++)
        if(chk(i))
            res++;

    cout << --i;
}